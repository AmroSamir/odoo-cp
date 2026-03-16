'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Tag from '@/components/ui/Tag'
import Alert from '@/components/ui/Alert'
import Spinner from '@/components/ui/Spinner'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import api from '@/lib/api'
import { usePolling } from '@/lib/usePolling'
import type { SslCert } from '@/@types/odoo'

function formatDate(dateStr: string | null): string {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
    })
}

function statusTagClass(status: SslCert['status']): string {
    switch (status) {
        case 'ok':
            return 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30'
        case 'warning':
            return 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-500/30'
        case 'critical':
            return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'
        case 'error':
            return 'bg-red-100 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/30'
        default:
            return 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-500'
    }
}

function statusLabel(status: SslCert['status']): string {
    switch (status) {
        case 'ok':
            return 'Valid'
        case 'warning':
            return 'Expiring Soon'
        case 'critical':
            return 'Critical'
        case 'error':
            return 'Error'
        default:
            return 'Unknown'
    }
}

export default function SslPage() {
    const { data: certs, loading, error, refresh } = usePolling<SslCert[]>('/ssl/status', 30000)

    const [renewing, setRenewing] = useState(false)

    const handleRenewAll = async () => {
        setRenewing(true)
        try {
            await api.post('/ssl/renew')
            toast.push(
                <Notification type="success" title="SSL Renewal Triggered">
                    Certificate renewal has been initiated for all domains.
                </Notification>
            )
            refresh()
        } catch (err: any) {
            toast.push(
                <Notification type="danger" title="Renewal Failed">
                    {err.response?.data?.error || 'Failed to renew certificates'}
                </Notification>
            )
        } finally {
            setRenewing(false)
        }
    }

    if (loading && !certs) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size={40} />
            </div>
        )
    }

    if (error) {
        return (
            <Alert type="danger" showIcon className="mb-4">
                Failed to load SSL status: {error}
            </Alert>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-semibold">SSL Certificates</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Monitor and manage SSL certificates for your domains
                    </p>
                </div>
                <Button
                    variant="solid"
                    size="md"
                    loading={renewing}
                    onClick={handleRenewAll}
                >
                    Renew All
                </Button>
            </div>

            {certs && certs.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                    {certs.map((cert) => (
                        <Card key={cert.domain}>
                            <div className="flex items-start justify-between mb-4">
                                <div>
                                    <h4 className="font-semibold text-base">{cert.domain}</h4>
                                </div>
                                <div className="flex items-center gap-2">
                                    {cert.isSelfSigned && (
                                        <Tag className="bg-orange-100 dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/30 text-xs">
                                            Self-Signed
                                        </Tag>
                                    )}
                                    <Tag className={`border text-xs font-medium ${statusTagClass(cert.status)}`}>
                                        {statusLabel(cert.status)}
                                    </Tag>
                                </div>
                            </div>

                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Expires</span>
                                    <span className="text-gray-700 dark:text-gray-200">
                                        {formatDate(cert.expiresAt)}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Days Left</span>
                                    <span
                                        className={`font-semibold ${
                                            cert.daysLeft === null
                                                ? 'text-gray-400'
                                                : cert.daysLeft <= 7
                                                  ? 'text-red-500'
                                                  : cert.daysLeft <= 30
                                                    ? 'text-amber-500'
                                                    : 'text-emerald-500'
                                        }`}
                                    >
                                        {cert.daysLeft !== null ? cert.daysLeft : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">Issued</span>
                                    <span className="text-gray-700 dark:text-gray-200">
                                        {formatDate(cert.issuedAt)}
                                    </span>
                                </div>
                            </div>

                            {cert.error && (
                                <Alert type="danger" showIcon className="mt-4 text-xs">
                                    {cert.error}
                                </Alert>
                            )}
                        </Card>
                    ))}
                </div>
            ) : (
                <Card>
                    <div className="py-16 text-center">
                        <p className="text-gray-400 dark:text-gray-500 text-lg mb-2">
                            No SSL certificates found
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">
                            SSL certificates will appear here once your domains are configured.
                        </p>
                    </div>
                </Card>
            )}
        </div>
    )
}
