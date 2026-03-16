'use client'

import { useState } from 'react'
import { Card, Button, Tag, Table, Spinner, Alert } from '@/components/ui'
import api from '@/lib/api'
import { usePolling } from '@/lib/usePolling'
import type { GitStatus } from '@/@types/odoo'
import {
    HiOutlineRefresh,
    HiOutlineDownload,
    HiOutlineExclamationCircle,
} from 'react-icons/hi'

const { THead, TBody, Tr, Th, Td } = Table

function formatDate(dateStr: string) {
    const d = new Date(dateStr)
    return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function truncateHash(hash: string) {
    return hash.substring(0, 7)
}

export default function GitPage() {
    const {
        data: status,
        loading,
        error,
        refresh,
    } = usePolling<GitStatus>('/git/status', 15000)

    const [pulling, setPulling] = useState(false)
    const [pullResult, setPullResult] = useState<{
        success: boolean
        message: string
    } | null>(null)

    const handlePull = async () => {
        setPulling(true)
        setPullResult(null)
        try {
            const res = await api.post<{ success: boolean; message: string }>(
                '/git/pull',
            )
            setPullResult(res.data)
            refresh()
        } catch (err: any) {
            setPullResult({
                success: false,
                message:
                    err.response?.data?.error ||
                    err.message ||
                    'Pull failed',
            })
        } finally {
            setPulling(false)
        }
    }

    if (loading && !status) {
        return (
            <div className="flex items-center justify-center h-64">
                <Spinner size={40} />
            </div>
        )
    }

    if (error) {
        return (
            <Alert type="danger" showIcon title="Failed to load Git status">
                {error}
            </Alert>
        )
    }

    if (!status) return null

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3>Git</h3>
                <div className="flex gap-2">
                    <Button
                        icon={<HiOutlineRefresh />}
                        size="sm"
                        onClick={refresh}
                    >
                        Refresh
                    </Button>
                    <Button
                        variant="solid"
                        icon={<HiOutlineDownload />}
                        size="sm"
                        loading={pulling}
                        onClick={handlePull}
                    >
                        Pull Latest
                    </Button>
                </div>
            </div>

            {pullResult && (
                <Alert
                    type={pullResult.success ? 'success' : 'danger'}
                    showIcon
                    closable
                    onClose={() => setPullResult(null)}
                    title={pullResult.success ? 'Pull Successful' : 'Pull Failed'}
                >
                    {pullResult.message}
                </Alert>
            )}

            <Card>
                <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm font-medium">
                            Branch
                        </span>
                        <Tag className="font-mono">{status.branch}</Tag>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm font-medium">
                            Status
                        </span>
                        {status.isDirty ? (
                            <Tag
                                className="bg-amber-100 dark:bg-amber-900 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-200"
                                prefix={
                                    <HiOutlineExclamationCircle className="text-amber-500 mr-1" />
                                }
                            >
                                Dirty
                            </Tag>
                        ) : (
                            <Tag className="bg-emerald-100 dark:bg-emerald-900 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-200">
                                Clean
                            </Tag>
                        )}
                    </div>

                    {(status.ahead > 0 || status.behind > 0) && (
                        <div className="flex items-center gap-2">
                            {status.ahead > 0 && (
                                <Tag className="bg-blue-100 dark:bg-blue-900 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-200">
                                    {status.ahead} ahead
                                </Tag>
                            )}
                            {status.behind > 0 && (
                                <Tag className="bg-orange-100 dark:bg-orange-900 border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-200">
                                    {status.behind} behind
                                </Tag>
                            )}
                        </div>
                    )}

                    <div className="flex items-center gap-3 ml-auto text-sm text-gray-500">
                        {status.staged > 0 && (
                            <span>
                                <span className="font-semibold text-emerald-600">
                                    {status.staged}
                                </span>{' '}
                                staged
                            </span>
                        )}
                        {status.modified > 0 && (
                            <span>
                                <span className="font-semibold text-amber-600">
                                    {status.modified}
                                </span>{' '}
                                modified
                            </span>
                        )}
                        {status.staged === 0 && status.modified === 0 && (
                            <span>No changes</span>
                        )}
                    </div>
                </div>
            </Card>

            {status.lastCommit && (
                <Card
                    header={{
                        content: 'Last Commit',
                        bordered: true,
                    }}
                >
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-3">
                            <code className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded font-mono">
                                {truncateHash(status.lastCommit.hash)}
                            </code>
                            <span className="font-medium">
                                {status.lastCommit.message}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                            <span>{status.lastCommit.author}</span>
                            <span>{formatDate(status.lastCommit.date)}</span>
                        </div>
                    </div>
                </Card>
            )}

            <Card
                header={{
                    content: 'Recent Commits',
                    bordered: true,
                }}
            >
                {status.recentCommits.length === 0 ? (
                    <p className="text-gray-500 text-sm">No commits found.</p>
                ) : (
                    <Table>
                        <THead>
                            <Tr>
                                <Th>Hash</Th>
                                <Th>Message</Th>
                                <Th>Author</Th>
                                <Th>Date</Th>
                            </Tr>
                        </THead>
                        <TBody>
                            {status.recentCommits.map((commit) => (
                                <Tr key={commit.hash}>
                                    <Td>
                                        <code className="text-xs bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono">
                                            {truncateHash(commit.hash)}
                                        </code>
                                    </Td>
                                    <Td>
                                        <span className="line-clamp-1">
                                            {commit.message}
                                        </span>
                                    </Td>
                                    <Td>
                                        <span className="text-gray-500 text-sm">
                                            {commit.author}
                                        </span>
                                    </Td>
                                    <Td>
                                        <span className="text-gray-500 text-sm whitespace-nowrap">
                                            {formatDate(commit.date)}
                                        </span>
                                    </Td>
                                </Tr>
                            ))}
                        </TBody>
                    </Table>
                )}
            </Card>
        </div>
    )
}
