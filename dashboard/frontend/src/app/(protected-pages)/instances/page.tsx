'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Dialog from '@/components/ui/Dialog'
import Drawer from '@/components/ui/Drawer'
import Input from '@/components/ui/Input'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import Switcher from '@/components/ui/Switcher'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import api from '@/lib/api'
import { usePolling } from '@/lib/usePolling'
import type { Instance } from '@/@types/odoo'

const apiPrefix = process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api'

function timeAgo(dateStr: string | null): string {
    if (!dateStr) return 'N/A'
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
}

function statusColor(status: string): string {
    if (status === 'running') return 'bg-emerald-500'
    if (status === 'exited') return 'bg-red-500'
    return 'bg-gray-400'
}

function statusTagClass(status: string): string {
    if (status === 'running') return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
    if (status === 'exited') return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'
    return 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-500'
}

function typeTagClass(type: 'production' | 'staging' | string): string {
    if (type === 'production') return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
    return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
}

export default function InstancesPage() {
    const { data: instances, loading, error, refresh } = usePolling<Instance[]>('/instances', 8000)

    const [createOpen, setCreateOpen] = useState(false)
    const [createName, setCreateName] = useState('')
    const [createPort, setCreatePort] = useState('')
    const [createTtl, setCreateTtl] = useState('')
    const [createSsl, setCreateSsl] = useState(false)
    const [createForkFrom, setCreateForkFrom] = useState('production')
    const [creating, setCreating] = useState(false)
    const [createError, setCreateError] = useState('')

    const [logDrawerOpen, setLogDrawerOpen] = useState(false)
    const [logInstance, setLogInstance] = useState<string | null>(null)
    const [logLines, setLogLines] = useState<string[]>([])
    const logEndRef = useRef<HTMLDivElement>(null)
    const esRef = useRef<EventSource | null>(null)

    const [actionLoading, setActionLoading] = useState<Record<string, string>>({})

    const sanitizeName = (value: string) => {
        return value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/--+/g, '-').replace(/^-/, '')
    }

    const handleCreate = async () => {
        if (!createName.trim()) {
            setCreateError('Name is required')
            return
        }
        setCreating(true)
        setCreateError('')
        try {
            await api.post('/instances', {
                name: sanitizeName(createName),
                port: createPort ? parseInt(createPort, 10) : undefined,
                ttlDays: createTtl ? parseInt(createTtl, 10) : undefined,
                withSsl: createSsl,
                forkFrom: createForkFrom,
            })
            toast.push(
                <Notification type="success" title="Instance Created">
                    Staging instance &quot;{sanitizeName(createName)}&quot; is being created.
                </Notification>
            )
            setCreateOpen(false)
            setCreateName('')
            setCreatePort('')
            setCreateTtl('')
            setCreateSsl(false)
            setCreateForkFrom('production')
            refresh()
        } catch (err: any) {
            setCreateError(err.response?.data?.error || 'Failed to create instance')
        } finally {
            setCreating(false)
        }
    }

    const handleAction = async (name: string, action: 'start' | 'stop' | 'restart') => {
        setActionLoading((prev) => ({ ...prev, [name]: action }))
        try {
            await api.post(`/instances/${name}/${action}`)
            toast.push(
                <Notification type="success" title="Action Completed">
                    {action.charAt(0).toUpperCase() + action.slice(1)} completed for &quot;{name}&quot;.
                </Notification>
            )
            refresh()
        } catch (err: any) {
            toast.push(
                <Notification type="danger" title="Action Failed">
                    {err.response?.data?.error || `Failed to ${action} instance`}
                </Notification>
            )
        } finally {
            setActionLoading((prev) => {
                const next = { ...prev }
                delete next[name]
                return next
            })
        }
    }

    const handleRemove = async (name: string) => {
        if (!confirm(`Remove staging instance "${name}"? This will delete all data.`)) return
        setActionLoading((prev) => ({ ...prev, [name]: 'remove' }))
        try {
            await api.delete(`/instances/${name}`)
            toast.push(
                <Notification type="success" title="Instance Removed">
                    &quot;{name}&quot; has been removed.
                </Notification>
            )
            refresh()
        } catch (err: any) {
            toast.push(
                <Notification type="danger" title="Remove Failed">
                    {err.response?.data?.error || 'Failed to remove instance'}
                </Notification>
            )
        } finally {
            setActionLoading((prev) => {
                const next = { ...prev }
                delete next[name]
                return next
            })
        }
    }

    const openLogs = useCallback((name: string) => {
        setLogInstance(name)
        setLogLines([])
        setLogDrawerOpen(true)
    }, [])

    useEffect(() => {
        if (!logDrawerOpen || !logInstance) {
            if (esRef.current) {
                esRef.current.close()
                esRef.current = null
            }
            return
        }

        const es = new EventSource(`${apiPrefix}/instances/${logInstance}/logs`, { withCredentials: true } as EventSourceInit)
        esRef.current = es

        es.onmessage = (event) => {
            setLogLines((prev) => [...prev.slice(-500), event.data])
        }

        es.onerror = () => {
            setLogLines((prev) => [...prev, '[Connection closed]'])
            es.close()
        }

        return () => {
            es.close()
            esRef.current = null
        }
    }, [logDrawerOpen, logInstance])

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logLines])

    const productionInstance = instances?.find((i) => i.type === 'production')
    const hasProduction = productionInstance !== undefined

    if (loading && !instances) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size={40} />
            </div>
        )
    }

    if (error) {
        return <Alert type="danger" showIcon className="mb-4">Failed to load instances: {error}</Alert>
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-semibold">Instances</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Manage your Odoo production and staging instances
                    </p>
                </div>
                <Button variant="solid" size="md" onClick={() => setCreateOpen(true)}>
                    + Create Staging
                </Button>
            </div>

            {!hasProduction && (
                <Alert type="warning" showIcon className="mb-6">
                    Production instance is not deployed. Deploy production first before creating staging instances.
                </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {instances?.map((instance) => {
                    const isLoading = !!actionLoading[instance.name]
                    const loadingAction = actionLoading[instance.name]
                    const isRunning = instance.status === 'running'

                    return (
                        <Card key={instance.name} className="relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <span className={`inline-block w-2.5 h-2.5 rounded-full ${statusColor(instance.status)}`} />
                                    <div>
                                        <h4 className="font-semibold text-base">{instance.name}</h4>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {instance.containerName}
                                        </span>
                                    </div>
                                </div>
                                <Tag className={`border ${typeTagClass(instance.type)} font-medium text-xs`}>
                                    {instance.type}
                                </Tag>
                            </div>

                            <div className="space-y-2 mb-4 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Status</span>
                                    <Tag className={`border text-xs ${statusTagClass(instance.status)}`}>
                                        {instance.status}
                                    </Tag>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Docker</span>
                                    <span className="text-gray-700 dark:text-gray-200">{instance.dockerStatus || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Port</span>
                                    <span className="font-mono text-gray-700 dark:text-gray-200">{instance.port}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Created</span>
                                    <span className="text-gray-700 dark:text-gray-200">{timeAgo(instance.createdAt)}</span>
                                </div>
                                {instance.ttlDays !== null && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">TTL</span>
                                        <span className="text-gray-700 dark:text-gray-200">{instance.ttlDays} days</span>
                                    </div>
                                )}
                                {instance.withSsl && (
                                    <div className="flex justify-between">
                                        <span className="text-gray-500 dark:text-gray-400">SSL</span>
                                        <Tag className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs">
                                            Enabled
                                        </Tag>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                                {!isRunning && (
                                    <Button
                                        size="xs"
                                        variant="solid"
                                        loading={loadingAction === 'start'}
                                        disabled={isLoading}
                                        onClick={() => handleAction(instance.name, 'start')}
                                    >
                                        Start
                                    </Button>
                                )}
                                {isRunning && (
                                    <Button
                                        size="xs"
                                        variant="default"
                                        loading={loadingAction === 'stop'}
                                        disabled={isLoading}
                                        onClick={() => handleAction(instance.name, 'stop')}
                                    >
                                        Stop
                                    </Button>
                                )}
                                <Button
                                    size="xs"
                                    variant="default"
                                    loading={loadingAction === 'restart'}
                                    disabled={isLoading}
                                    onClick={() => handleAction(instance.name, 'restart')}
                                >
                                    Restart
                                </Button>
                                <Button
                                    size="xs"
                                    variant="plain"
                                    disabled={isLoading}
                                    onClick={() => openLogs(instance.name)}
                                >
                                    Logs
                                </Button>
                                {instance.type === 'staging' && (
                                    <Button
                                        size="xs"
                                        variant="plain"
                                        className="text-red-500 hover:text-red-600"
                                        loading={loadingAction === 'remove'}
                                        disabled={isLoading}
                                        onClick={() => handleRemove(instance.name)}
                                    >
                                        Remove
                                    </Button>
                                )}
                            </div>
                        </Card>
                    )
                })}

                <Card
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 cursor-pointer hover:border-primary hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors flex items-center justify-center min-h-[200px]"
                    clickable
                    onClick={() => setCreateOpen(true)}
                >
                    <div className="text-center text-gray-400 dark:text-gray-500">
                        <div className="text-3xl mb-2">+</div>
                        <div className="font-medium">Create Staging Instance</div>
                    </div>
                </Card>
            </div>

            {/* Create Staging Dialog */}
            <Dialog
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                closable
                width={480}
            >
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-1">Create Staging Instance</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                        Clone data from any instance into a new isolated staging environment.
                    </p>

                    {createError && (
                        <Alert type="danger" showIcon className="mb-4">{createError}</Alert>
                    )}

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Instance Name *</label>
                            <Input
                                placeholder="e.g. test-invoice"
                                value={createName}
                                onChange={(e) => setCreateName(sanitizeName((e.target as HTMLInputElement).value))}
                            />
                            {createName && (
                                <p className="text-xs text-gray-400 mt-1">
                                    Container: stg-{sanitizeName(createName)}
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Fork from</label>
                            <select
                                className="w-full h-11 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                                value={createForkFrom}
                                onChange={(e) => setCreateForkFrom(e.target.value)}
                            >
                                {productionInstance && (
                                    <option value="production">
                                        {productionInstance.name} (production)
                                    </option>
                                )}
                                {instances?.filter((i) => i.type === 'staging').map((i) => (
                                    <option key={i.name} value={i.name}>
                                        {i.name}{i.status !== 'running' ? ` (${i.status})` : ''}
                                    </option>
                                ))}
                            </select>
                            <p className="text-xs text-gray-400 mt-1">
                                Database and filestore will be cloned from this instance
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Port (optional)</label>
                            <Input
                                type="number"
                                placeholder="8171-8199 (auto-assigned if empty)"
                                value={createPort}
                                onChange={(e) => {
                                    const val = (e.target as HTMLInputElement).value
                                    if (val === '' || (parseInt(val) >= 8171 && parseInt(val) <= 8199)) {
                                        setCreatePort(val)
                                    }
                                }}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">TTL Days (optional)</label>
                            <Input
                                type="number"
                                placeholder="Auto-delete after N days"
                                value={createTtl}
                                onChange={(e) => setCreateTtl((e.target as HTMLInputElement).value)}
                            />
                        </div>

                        <div className="flex items-center justify-between">
                            <div>
                                <label className="block text-sm font-medium">Enable SSL</label>
                                <p className="text-xs text-gray-400">Auto-generate SSL certificate</p>
                            </div>
                            <Switcher
                                checked={createSsl}
                                onChange={(checked) => setCreateSsl(checked)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="plain" onClick={() => setCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            loading={creating}
                            onClick={handleCreate}
                        >
                            Create Instance
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Log Drawer */}
            <Drawer
                isOpen={logDrawerOpen}
                onClose={() => setLogDrawerOpen(false)}
                placement="right"
                width={600}
                title={
                    <div className="flex items-center gap-3">
                        <span>Logs: {logInstance}</span>
                        <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 text-xs">
                            streaming
                        </Tag>
                    </div>
                }
            >
                <div className="h-full flex flex-col">
                    <div className="flex-1 bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-auto font-mono text-xs text-green-400 leading-relaxed min-h-[400px]">
                        {logLines.length === 0 && (
                            <span className="text-gray-500">Connecting to log stream...</span>
                        )}
                        {logLines.map((line, i) => (
                            <div key={i} className="whitespace-pre-wrap break-all">
                                {line}
                            </div>
                        ))}
                        <div ref={logEndRef} />
                    </div>
                    <div className="flex justify-end gap-2 mt-3">
                        <Button
                            size="sm"
                            variant="default"
                            onClick={() => {
                                navigator.clipboard.writeText(logLines.join('\n'))
                                toast.push(
                                    <Notification type="success" title="Copied">
                                        Log content copied to clipboard.
                                    </Notification>
                                )
                            }}
                        >
                            Copy Logs
                        </Button>
                        <Button
                            size="sm"
                            variant="plain"
                            onClick={() => setLogLines([])}
                        >
                            Clear
                        </Button>
                    </div>
                </div>
            </Drawer>
        </div>
    )
}
