'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Input from '@/components/ui/Input'
import Button from '@/components/ui/Button'
import Alert from '@/components/ui/Alert'
import axios from 'axios'

const apiPrefix = process.env.NODE_ENV === 'development' ? 'http://localhost:3000/api' : '/api'

export default function SignInPage() {
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)
    const router = useRouter()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setLoading(true)
        try {
            await axios.post(`${apiPrefix}/auth/login`, { password }, { withCredentials: true })
            router.push('/instances')
        } catch (err: any) {
            setError(err.response?.data?.error || 'Login failed')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="flex flex-col items-center">
            <h2 className="mb-1 text-2xl font-semibold">Sign In</h2>
            <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">Enter your admin password</p>
            {error && <Alert className="mb-4 w-full" type="danger" showIcon>{error}</Alert>}
            <form onSubmit={handleSubmit} className="w-full space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-1">Password</label>
                    <Input
                        type="password"
                        placeholder="Enter admin password"
                        value={password}
                        onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
                        autoFocus
                    />
                </div>
                <Button
                    block
                    variant="solid"
                    type="submit"
                    loading={loading}
                >
                    Sign in
                </Button>
            </form>
        </div>
    )
}
