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
import Table from '@/components/ui/Table'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import api from '@/lib/api'
import { usePolling } from '@/lib/usePolling'
import type { DeployHistoryEntry } from '@/@types/odoo'

const apiPrefix = process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api'

type DeployStatus = 'idle' | 'running' | 'done' | 'failed'

function formatDate(dateStr: string | undefined): string {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    })
}

function statusTagClass(status: string): string {
    switch (status) {
        case 'success':
            return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
        case 'failed':
            return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'
        case 'started':
            return 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
        default:
            return 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-500'
    }
}

function targetTagClass(target: string): string {
    if (target === 'production') return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
    return 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-500/30'
}

export default function DeployPage() {
    const { data: history, loading: historyLoading } = usePolling<DeployHistoryEntry[]>('/deploy/history', 10000)

    // Production confirmation dialog
    const [prodConfirmOpen, setProdConfirmOpen] = useState(false)
    const [confirmText, setConfirmText] = useState('')

    // Deploy log drawer
    const [drawerOpen, setDrawerOpen] = useState(false)
    const [deployTarget, setDeployTarget] = useState<'staging' | 'production' | null>(null)
    const [deployStatus, setDeployStatus] = useState<DeployStatus>('idle')
    const [logLines, setLogLines] = useState<string[]>([])
    const [elapsedSeconds, setElapsedSeconds] = useState(0)
    const logEndRef = useRef<HTMLDivElement>(null)
    const esRef = useRef<EventSource | null>(null)
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const [deploying, setDeploying] = useState<'staging' | 'production' | null>(null)

    const startTimer = useCallback(() => {
        setElapsedSeconds(0)
        if (timerRef.current) clearInterval(timerRef.current)
        timerRef.current = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1)
        }, 1000)
    }, [])

    const stopTimer = useCallback(() => {
        if (timerRef.current) {
            clearInterval(timerRef.current)
            timerRef.current = null
        }
    }, [])

    const formatElapsed = (seconds: number): string => {
        const m = Math.floor(seconds / 60)
        const s = seconds % 60
        return `${m}:${s.toString().padStart(2, '0')}`
    }

    const startDeploy = useCallback((target: 'staging' | 'production') => {
        setDeployTarget(target)
        setLogLines([])
        setDeployStatus('running')
        setDrawerOpen(true)
        setDeploying(target)
        startTimer()

        // Close existing EventSource
        if (esRef.current) {
            esRef.current.close()
            esRef.current = null
        }

        const url = target === 'production'
            ? `${apiPrefix}/deploy/production?confirmed=true`
            : `${apiPrefix}/deploy/staging`

        const es = new EventSource(url, { withCredentials: true } as EventSourceInit)
        esRef.current = es

        es.addEventListener('log', (event) => {
            setLogLines((prev) => [...prev, event.data])
        })

        es.addEventListener('done', () => {
            setDeployStatus('done')
            setDeploying(null)
            stopTimer()
            es.close()
            esRef.current = null
            toast.push(
                <Notification type="success" title="Deploy Complete">
                    Successfully deployed to {target}.
                </Notification>
            )
        })

        es.addEventListener('error', (event) => {
            setDeployStatus('failed')
            setDeploying(null)
            stopTimer()
            es.close()
            esRef.current = null
            toast.push(
                <Notification type="danger" title="Deploy Failed">
                    Deployment to {target} failed. Check logs for details.
                </Notification>
            )
        })

        es.onerror = () => {
            if (esRef.current === es) {
                setDeployStatus('failed')
                setDeploying(null)
                stopTimer()
                es.close()
                esRef.current = null
            }
        }
    }, [startTimer, stopTimer])

    const handleStagingDeploy = () => {
        startDeploy('staging')
    }

    const handleProductionDeploy = () => {
        setProdConfirmOpen(true)
        setConfirmText('')
    }

    const confirmProductionDeploy = () => {
        setProdConfirmOpen(false)
        setConfirmText('')
        startDeploy('production')
    }

    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logLines])

    useEffect(() => {
        return () => {
            if (esRef.current) esRef.current.close()
            stopTimer()
        }
    }, [stopTimer])

    const deployStatusBadge = () => {
        switch (deployStatus) {
            case 'running':
                return (
                    <Tag className="bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 text-xs">
                        <span className="flex items-center gap-1.5">
                            <Spinner size={12} />
                            Running
                        </span>
                    </Tag>
                )
            case 'done':
                return (
                    <Tag className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs">
                        Done
                    </Tag>
                )
            case 'failed':
                return (
                    <Tag className="bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 text-xs">
                        Failed
                    </Tag>
                )
            default:
                return null
        }
    }

    return (
        <div>
            <div className="mb-6">
                <h2 className="text-2xl font-semibold">Deploy</h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    Deploy your Odoo application to staging or production
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Staging Deploy Card */}
                <Card className="border-l-4 border-l-blue-500">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold">Deploy to Staging</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Pull latest changes and rebuild the staging environment. Safe to run anytime.
                            </p>
                        </div>
                        <Tag className="bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 text-xs font-medium">
                            staging
                        </Tag>
                    </div>
                    <Button
                        variant="solid"
                        className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 border-blue-600"
                        loading={deploying === 'staging'}
                        disabled={deploying !== null}
                        onClick={handleStagingDeploy}
                        block
                    >
                        Deploy to Staging
                    </Button>
                </Card>

                {/* Production Deploy Card */}
                <Card className="border-l-4 border-l-emerald-500">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="text-lg font-semibold">Deploy to Production</h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                Backs up the database, pulls latest changes, and rebuilds production.
                            </p>
                        </div>
                        <Tag className="bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 text-xs font-medium">
                            production
                        </Tag>
                    </div>
                    <Button
                        variant="solid"
                        className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 border-emerald-600"
                        loading={deploying === 'production'}
                        disabled={deploying !== null}
                        onClick={handleProductionDeploy}
                        block
                    >
                        Deploy to Production
                    </Button>
                </Card>
            </div>

            {/* Deploy History */}
            <Card
                header={{
                    content: 'Deploy History',
                    bordered: true,
                }}
            >
                {historyLoading && !history ? (
                    <div className="flex items-center justify-center py-8">
                        <Spinner size={30} />
                    </div>
                ) : !history || history.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 dark:text-gray-500">
                        No deployment history yet
                    </div>
                ) : (
                    <Table>
                        <Table.THead>
                            <Table.Tr>
                                <Table.Th>Target</Table.Th>
                                <Table.Th>Status</Table.Th>
                                <Table.Th>Started</Table.Th>
                                <Table.Th>Finished</Table.Th>
                                <Table.Th>Triggered By</Table.Th>
                            </Table.Tr>
                        </Table.THead>
                        <Table.TBody>
                            {history.map((entry) => (
                                <Table.Tr key={entry.id}>
                                    <Table.Td>
                                        <Tag className={`border text-xs font-medium ${targetTagClass(entry.target)}`}>
                                            {entry.target}
                                        </Tag>
                                    </Table.Td>
                                    <Table.Td>
                                        <Tag className={`border text-xs ${statusTagClass(entry.status)}`}>
                                            {entry.status}
                                        </Tag>
                                    </Table.Td>
                                    <Table.Td className="text-sm text-gray-600 dark:text-gray-300">
                                        {formatDate(entry.startedAt)}
                                    </Table.Td>
                                    <Table.Td className="text-sm text-gray-600 dark:text-gray-300">
                                        {formatDate(entry.finishedAt)}
                                    </Table.Td>
                                    <Table.Td className="text-sm text-gray-600 dark:text-gray-300">
                                        {entry.triggeredBy}
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.TBody>
                    </Table>
                )}
            </Card>

            {/* Production Confirmation Dialog */}
            <Dialog
                isOpen={prodConfirmOpen}
                onClose={() => setProdConfirmOpen(false)}
                closable
                width={460}
            >
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-1 text-red-600 dark:text-red-400">
                        Confirm Production Deploy
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                        This will create a database backup and redeploy the production environment. Odoo will be temporarily unavailable during the process.
                    </p>

                    <Alert type="warning" showIcon className="mb-4">
                        Type <strong>deploy production</strong> below to confirm.
                    </Alert>

                    <Input
                        placeholder="deploy production"
                        value={confirmText}
                        onChange={(e) => setConfirmText((e.target as HTMLInputElement).value)}
                        autoFocus
                    />

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="plain" onClick={() => setProdConfirmOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            className="bg-red-600 hover:bg-red-700 active:bg-red-800 border-red-600"
                            disabled={confirmText !== 'deploy production'}
                            onClick={confirmProductionDeploy}
                        >
                            Deploy Now
                        </Button>
                    </div>
                </div>
            </Dialog>

            {/* Deploy Log Drawer */}
            <Drawer
                isOpen={drawerOpen}
                onClose={() => {
                    if (deployStatus !== 'running') {
                        setDrawerOpen(false)
                    }
                }}
                closable={deployStatus !== 'running'}
                placement="right"
                width={650}
                title={
                    <div className="flex items-center gap-3">
                        <span>Deploy: {deployTarget}</span>
                        {deployStatusBadge()}
                        <span className="text-xs font-mono text-gray-400 ml-auto">
                            {formatElapsed(elapsedSeconds)}
                        </span>
                    </div>
                }
            >
                <div className="h-full flex flex-col">
                    <div className="flex-1 bg-gray-900 dark:bg-gray-950 rounded-lg p-4 overflow-auto min-h-[400px]">
                        <pre className="font-mono text-xs text-green-400 leading-relaxed whitespace-pre-wrap break-all">
                            {logLines.length === 0 && (
                                <span className="text-gray-500">Waiting for deployment output...</span>
                            )}
                            {logLines.map((line, i) => (
                                <div key={i}>{line}</div>
                            ))}
                            <div ref={logEndRef} />
                        </pre>
                    </div>
                    <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-400">
                            {logLines.length} lines
                        </span>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                variant="default"
                                onClick={() => {
                                    navigator.clipboard.writeText(logLines.join('\n'))
                                    toast.push(
                                        <Notification type="success" title="Copied">
                                            Deploy log copied to clipboard.
                                        </Notification>
                                    )
                                }}
                            >
                                Copy Log
                            </Button>
                            {deployStatus !== 'running' && (
                                <Button
                                    size="sm"
                                    variant="plain"
                                    onClick={() => setDrawerOpen(false)}
                                >
                                    Close
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </Drawer>
        </div>
    )
}
