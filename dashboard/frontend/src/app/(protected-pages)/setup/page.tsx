'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, Button, Input, Spinner, Alert, Drawer, Tag } from '@/components/ui'
import api from '@/lib/api'
import type { SetupStatus } from '@/@types/odoo'
import {
    HiOutlineCheckCircle,
    HiOutlineXCircle,
    HiOutlineGlobe,
    HiOutlineServer,
    HiOutlineMail,
    HiOutlinePlay,
    HiOutlineDocumentText,
} from 'react-icons/hi'

const apiPrefix =
    process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api'

export default function SetupPage() {
    const [status, setStatus] = useState<SetupStatus | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [domain, setDomain] = useState('')
    const [stagingDomain, setStagingDomain] = useState('')
    const [submitting, setSubmitting] = useState(false)

    const [drawerOpen, setDrawerOpen] = useState(false)
    const [logs, setLogs] = useState<string[]>([])
    const [setupComplete, setSetupComplete] = useState(false)
    const [setupError, setSetupError] = useState(false)
    const logsEndRef = useRef<HTMLDivElement>(null)

    const fetchStatus = useCallback(async () => {
        try {
            const res = await api.get<SetupStatus>('/setup/status')
            setStatus(res.data)
            setError(null)
        } catch (err: any) {
            setError(err.response?.data?.error || err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchStatus()
    }, [fetchStatus])

    useEffect(() => {
        if (drawerOpen && logsEndRef.current) {
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
        }
    }, [logs, drawerOpen])

    const handleSetup = async () => {
        if (!domain.trim()) return

        setSubmitting(true)
        setLogs([])
        setSetupComplete(false)
        setSetupError(false)
        setDrawerOpen(true)

        try {
            const response = await fetch(`${apiPrefix}/setup/initial`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    domain: domain.trim(),
                    stagingDomain: stagingDomain.trim() || undefined,
                }),
            })

            if (!response.ok) {
                const errData = await response.json().catch(() => null)
                throw new Error(
                    errData?.error || `Setup failed with status ${response.status}`,
                )
            }

            const reader = response.body?.getReader()
            if (!reader) {
                throw new Error('No response stream available')
            }

            const decoder = new TextDecoder()
            let buffer = ''

            while (true) {
                const { done, value } = await reader.read()
                if (done) break

                buffer += decoder.decode(value, { stream: true })
                const lines = buffer.split('\n')
                buffer = lines.pop() || ''

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6)
                        if (data === '[DONE]') {
                            setSetupComplete(true)
                            fetchStatus()
                        } else if (data === '[ERROR]') {
                            setSetupError(true)
                        } else {
                            setLogs((prev) => [...prev, data])
                        }
                    }
                }
            }

            if (buffer.startsWith('data: ')) {
                const data = buffer.slice(6)
                if (data === '[DONE]') {
                    setSetupComplete(true)
                    fetchStatus()
                } else if (data === '[ERROR]') {
                    setSetupError(true)
                } else {
                    setLogs((prev) => [...prev, data])
                }
            }
        } catch (err: any) {
            setSetupError(true)
            setLogs((prev) => [...prev, `Error: ${err.message}`])
        } finally {
            setSubmitting(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size={40} />
            </div>
        )
    }

    if (error) {
        return (
            <Alert type="danger" showIcon title="Failed to load setup status">
                {error}
            </Alert>
        )
    }

    if (!status) return null

    const effectiveDomain = status.domainProd || domain.trim()

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3>Setup</h3>
            </div>

            <Card
                header={{
                    content: 'Deployment Status',
                    bordered: true,
                    extra: status.productionDeployed ? (
                        <Tag className="bg-emerald-100 dark:bg-emerald-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200">
                            Deployed
                        </Tag>
                    ) : (
                        <Tag className="bg-amber-100 dark:bg-amber-900 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-200">
                            Not Deployed
                        </Tag>
                    ),
                }}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StatusRow
                        icon={<HiOutlineGlobe className="text-lg" />}
                        label="Production Domain"
                        value={status.domainProd}
                        ok={!!status.domainProd}
                    />
                    <StatusRow
                        icon={<HiOutlineGlobe className="text-lg" />}
                        label="Staging Domain"
                        value={status.domainStaging}
                        ok={!!status.domainStaging}
                    />
                    <StatusRow
                        icon={<HiOutlineGlobe className="text-lg" />}
                        label="Dashboard Domain"
                        value={status.domainDashboard}
                        ok={!!status.domainDashboard}
                    />
                    <StatusRow
                        icon={<HiOutlineMail className="text-lg" />}
                        label="SSL Email"
                        value={status.sslEmail}
                        ok={!!status.sslEmail}
                    />
                    <StatusRow
                        icon={<HiOutlineServer className="text-lg" />}
                        label="Server IP"
                        value={status.serverIp}
                        ok={!!status.serverIp}
                    />
                </div>
            </Card>

            {!status.productionDeployed && (
                <Card
                    header={{
                        content: 'Initial Setup',
                        bordered: true,
                    }}
                >
                    <div className="flex flex-col gap-4">
                        <p className="text-sm text-gray-500">
                            Enter your production domain to begin the initial
                            server setup. This will configure Nginx, SSL
                            certificates, and deploy Odoo for the first time.
                        </p>
                        <div className="flex flex-col gap-3">
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Production Domain{' '}
                                    <span className="text-red-500">*</span>
                                </label>
                                <Input
                                    placeholder="erp.example.com"
                                    value={domain}
                                    onChange={(e) =>
                                        setDomain(
                                            (e.target as HTMLInputElement).value,
                                        )
                                    }
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">
                                    Staging Domain{' '}
                                    <span className="text-gray-400">
                                        (optional)
                                    </span>
                                </label>
                                <Input
                                    placeholder="staging-erp.example.com"
                                    value={stagingDomain}
                                    onChange={(e) =>
                                        setStagingDomain(
                                            (e.target as HTMLInputElement).value,
                                        )
                                    }
                                />
                            </div>
                            <div>
                                <Button
                                    variant="solid"
                                    icon={<HiOutlinePlay />}
                                    loading={submitting}
                                    disabled={!domain.trim()}
                                    onClick={handleSetup}
                                >
                                    Start Setup
                                </Button>
                            </div>
                        </div>
                    </div>
                </Card>
            )}

            {status.productionDeployed && (
                <Card
                    header={{
                        content: 'Post-Deploy Checklist',
                        bordered: true,
                    }}
                >
                    <div className="flex flex-col gap-3">
                        <ChecklistItem step={1}>
                            Go to{' '}
                            <a
                                href={`https://${status.domainProd}/web/database/manager`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline"
                            >
                                https://{status.domainProd}/web/database/manager
                            </a>
                        </ChecklistItem>
                        <ChecklistItem step={2}>
                            Create a database{' '}
                            <span className="font-semibold">(lowercase name only)</span>
                        </ChecklistItem>
                        <ChecklistItem step={3}>
                            Install the{' '}
                            <code className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded text-sm">
                                odoo_unlimited
                            </code>{' '}
                            module from Apps
                        </ChecklistItem>
                        <ChecklistItem step={4}>
                            Activate Enterprise using any registration code
                        </ChecklistItem>
                    </div>
                </Card>
            )}

            <Drawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={
                    <div className="flex items-center gap-2">
                        <HiOutlineDocumentText className="text-lg" />
                        <span>Setup Logs</span>
                        {submitting && <Spinner size={16} />}
                    </div>
                }
                placement="right"
                width={600}
            >
                <div className="flex flex-col h-full">
                    <div className="flex-1 overflow-y-auto bg-gray-950 rounded-lg p-4 font-mono text-xs text-gray-300 leading-relaxed">
                        {logs.length === 0 && !setupComplete && !setupError && (
                            <span className="text-gray-500">
                                Waiting for output...
                            </span>
                        )}
                        {logs.map((line, i) => (
                            <div
                                key={i}
                                className={
                                    line.startsWith('Error')
                                        ? 'text-red-400'
                                        : line.includes('SUCCESS') ||
                                            line.includes('Done') ||
                                            line.includes('Complete')
                                          ? 'text-emerald-400'
                                          : ''
                                }
                            >
                                {line}
                            </div>
                        ))}
                        <div ref={logsEndRef} />
                    </div>

                    {setupComplete && (
                        <div className="mt-4">
                            <Alert type="success" showIcon title="Setup Complete">
                                Production environment has been deployed
                                successfully. Follow the post-deploy checklist
                                to finish configuration.
                            </Alert>
                        </div>
                    )}

                    {setupError && (
                        <div className="mt-4">
                            <Alert type="danger" showIcon title="Setup Failed">
                                An error occurred during setup. Check the logs
                                above for details.
                            </Alert>
                        </div>
                    )}
                </div>
            </Drawer>
        </div>
    )
}

function StatusRow({
    icon,
    label,
    value,
    ok,
}: {
    icon: React.ReactNode
    label: string
    value: string | null
    ok: boolean
}) {
    return (
        <div className="flex items-center gap-3">
            <div className="text-gray-400">{icon}</div>
            <div className="flex flex-col">
                <span className="text-xs text-gray-500">{label}</span>
                <div className="flex items-center gap-2">
                    {ok ? (
                        <HiOutlineCheckCircle className="text-emerald-500 text-sm" />
                    ) : (
                        <HiOutlineXCircle className="text-gray-300 dark:text-gray-600 text-sm" />
                    )}
                    <span className="text-sm font-medium">
                        {value || 'Not configured'}
                    </span>
                </div>
            </div>
        </div>
    )
}

function ChecklistItem({
    step,
    children,
}: {
    step: number
    children: React.ReactNode
}) {
    return (
        <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center mt-0.5">
                {step}
            </span>
            <span className="text-sm">{children}</span>
        </div>
    )
}
