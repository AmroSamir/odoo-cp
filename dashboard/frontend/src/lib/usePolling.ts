'use client'

import { useState, useEffect, useCallback } from 'react'
import api from './api'

export function usePolling<T>(url: string, intervalMs = 5000, enabled = true) {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetch = useCallback(async () => {
        try {
            const res = await api.get<T>(url)
            setData(res.data)
            setError(null)
        } catch (err: any) {
            setError(err.response?.data?.error || err.message)
        } finally {
            setLoading(false)
        }
    }, [url])

    useEffect(() => {
        if (!enabled) return
        fetch()
        const id = setInterval(fetch, intervalMs)
        return () => clearInterval(id)
    }, [fetch, intervalMs, enabled])

    return { data, loading, error, refresh: fetch }
}
