'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    // Basic client-side validation
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedEmail || !trimmedPassword) {
      const message = 'Email and password are required'
      setError(message)
      toast.error(message)
      return
    }

    setLoading(true)
    localStorage.removeItem('auth-token')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        const message =
          data.error ||
          (response.status === 401
            ? 'Invalid email or password'
            : 'Login failed')
        setError(message)
        toast.error(message)
        return
      }

      if (data.token) {
        localStorage.setItem('auth-token', data.token)
      }

      toast.success('Signed in successfully')
      router.push('/chat')
    } catch (err) {
      const message = 'Something went wrong. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="max-w-md w-full space-y-8 p-8 border border-black rounded-2xl shadow-sm">
        <div>
          <h2 className="text-3xl font-bold text-center text-black">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-black">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-black">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-black rounded-xl focus:outline-none focus:ring-2 focus:ring-black"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-black rounded-full text-sm font-medium text-white bg-black hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-700">Don't have an account? </span>
            <Link href="/signup" className="font-medium text-black underline hover:text-gray-700">
              Sign up
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

