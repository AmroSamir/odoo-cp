'use client'

import { useState } from 'react'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import Dialog from '@/components/ui/Dialog'
import Alert from '@/components/ui/Alert'
import Table from '@/components/ui/Table'
import Spinner from '@/components/ui/Spinner'
import Notification from '@/components/ui/Notification'
import toast from '@/components/ui/toast'
import api from '@/lib/api'
import { usePolling } from '@/lib/usePolling'
import type { Backup } from '@/@types/odoo'

function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export default function BackupsPage() {
    const { data: backups, loading, error, refresh } = usePolling<Backup[]>('/backups', 15000)

    const [creating, setCreating] = useState(false)
    const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
    const [deleting, setDeleting] = useState(false)

    const handleCreate = async () => {
        setCreating(true)
        try {
            await api.post('/backups')
            toast.push(
                <Notification type="success" title="Backup Started">
                    A new database backup is being created.
                </Notification>
            )
            refresh()
        } catch (err: any) {
            toast.push(
                <Notification type="danger" title="Backup Failed">
                    {err.response?.data?.error || 'Failed to create backup'}
                </Notification>
            )
        } finally {
            setCreating(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await api.delete(`/backups/${deleteTarget}`)
            toast.push(
                <Notification type="success" title="Backup Deleted">
                    &quot;{deleteTarget}&quot; has been deleted.
                </Notification>
            )
            setDeleteTarget(null)
            refresh()
        } catch (err: any) {
            toast.push(
                <Notification type="danger" title="Delete Failed">
                    {err.response?.data?.error || 'Failed to delete backup'}
                </Notification>
            )
        } finally {
            setDeleting(false)
        }
    }

    if (loading && !backups) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size={40} />
            </div>
        )
    }

    if (error) {
        return (
            <Alert type="danger" showIcon className="mb-4">
                Failed to load backups: {error}
            </Alert>
        )
    }

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-semibold">Database Backups</h2>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                        Create and manage database backups
                    </p>
                </div>
                <Button
                    variant="solid"
                    size="md"
                    loading={creating}
                    onClick={handleCreate}
                >
                    Create Backup
                </Button>
            </div>

            <Card>
                {backups && backups.length > 0 ? (
                    <Table>
                        <Table.THead>
                            <Table.Tr>
                                <Table.Th>Filename</Table.Th>
                                <Table.Th>Size (MB)</Table.Th>
                                <Table.Th>Created</Table.Th>
                                <Table.Th className="text-right">Actions</Table.Th>
                            </Table.Tr>
                        </Table.THead>
                        <Table.TBody>
                            {backups.map((backup) => (
                                <Table.Tr key={backup.filename}>
                                    <Table.Td>
                                        <span className="font-mono text-sm">
                                            {backup.filename}
                                        </span>
                                    </Table.Td>
                                    <Table.Td>
                                        {backup.sizeMB.toFixed(1)}
                                    </Table.Td>
                                    <Table.Td>
                                        {formatDate(backup.createdAt)}
                                    </Table.Td>
                                    <Table.Td className="text-right">
                                        <Button
                                            size="xs"
                                            variant="plain"
                                            className="text-red-500 hover:text-red-600"
                                            onClick={() => setDeleteTarget(backup.filename)}
                                        >
                                            Delete
                                        </Button>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.TBody>
                    </Table>
                ) : (
                    <div className="py-16 text-center">
                        <p className="text-gray-400 dark:text-gray-500 text-lg mb-2">
                            No backups found
                        </p>
                        <p className="text-gray-400 dark:text-gray-500 text-sm">
                            Click &quot;Create Backup&quot; to create your first database backup.
                        </p>
                    </div>
                )}
            </Card>

            <Dialog
                isOpen={!!deleteTarget}
                onClose={() => {
                    if (!deleting) setDeleteTarget(null)
                }}
                closable={!deleting}
                width={440}
            >
                <div className="p-6">
                    <h3 className="text-lg font-semibold mb-2">Delete Backup</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                        Are you sure you want to delete this backup?
                    </p>
                    <p className="font-mono text-sm bg-gray-100 dark:bg-gray-800 rounded px-3 py-2 mb-5">
                        {deleteTarget}
                    </p>
                    <Alert type="warning" showIcon className="mb-5">
                        This action cannot be undone.
                    </Alert>
                    <div className="flex justify-end gap-3">
                        <Button
                            variant="plain"
                            disabled={deleting}
                            onClick={() => setDeleteTarget(null)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="solid"
                            color="red"
                            loading={deleting}
                            onClick={handleDelete}
                        >
                            Delete Backup
                        </Button>
                    </div>
                </div>
            </Dialog>
        </div>
    )
}
