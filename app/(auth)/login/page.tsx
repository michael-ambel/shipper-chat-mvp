'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { LogIn, Mail, Lock, CheckCircle2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [emailValid, setEmailValid] = useState(false)

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setEmailValid(value.length > 0 && validateEmail(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: '#F3F3EE' }}>
      {/* Subtle animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-20 left-10 w-72 h-72 rounded-full opacity-5 blur-3xl auth-float-1"
          style={{ backgroundColor: '#1E9A80' }}
        />
        <div 
          className="absolute bottom-20 right-10 w-96 h-96 rounded-full opacity-5 blur-3xl auth-float-2"
          style={{ backgroundColor: '#1E9A80' }}
        />
      </div>

      <div className="w-full relative z-10 auth-slide-in" style={{ maxWidth: '400px', padding: '0 16px' }}>
        <div className="mb-12">
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#09090B', 
            lineHeight: '20px',
            marginBottom: '4px'
          }}>
            Welcome back
          </h2>
          <p style={{ 
            fontSize: '14px', 
            fontWeight: 400, 
            color: '#8B8B8B',
            lineHeight: '20px'
          }}>
            Sign in to continue to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="email" 
              style={{ 
                fontSize: '14px', 
                fontWeight: 500, 
                color: '#09090B',
                lineHeight: '20px',
                display: 'block',
                marginBottom: '8px'
              }}
            >
              Email address
            </label>
            <div className="relative">
              <div 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none transition-colors"
                style={{ color: focusedField === 'email' ? '#1E9A80' : '#8B8B8B' }}
              >
                <Mail size={16} />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={handleEmailChange}
                onFocus={() => setFocusedField('email')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '44px',
                  paddingRight: emailValid ? '44px' : '16px',
                  border: focusedField === 'email' ? '2px solid #1E9A80' : '1px solid #E8E5DF',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#404040',
                  backgroundColor: focusedField === 'email' ? '#F0FDF4' : '#FFFFFF',
                  transition: 'all 0.2s ease'
                }}
                className="focus:outline-none"
              />
              {emailValid && (
                <div className="absolute right-4 top-1/2 transform -translate-y-1/2 pointer-events-none auth-check-slide">
                  <CheckCircle2 size={16} style={{ color: '#1E9A80' }} />
                </div>
              )}
            </div>
          </div>

          <div>
            <label 
              htmlFor="password" 
              style={{ 
                fontSize: '14px', 
                fontWeight: 500, 
                color: '#09090B',
                lineHeight: '20px',
                display: 'block',
                marginBottom: '8px'
              }}
            >
              Password
            </label>
            <div className="relative">
              <div 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none transition-colors"
                style={{ color: focusedField === 'password' ? '#1E9A80' : '#8B8B8B' }}
              >
                <Lock size={16} />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '44px',
                  paddingRight: '16px',
                  border: focusedField === 'password' ? '2px solid #1E9A80' : '1px solid #E8E5DF',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#404040',
                  backgroundColor: focusedField === 'password' ? '#F0FDF4' : '#FFFFFF',
                  transition: 'all 0.2s ease'
                }}
                className="focus:outline-none"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !emailValid || !password}
            className="w-full relative flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
            style={{
              height: '40px',
              padding: '0 16px',
              backgroundColor: '#1E9A80',
              borderRadius: '9999px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              border: 'none',
              cursor: loading || !emailValid || !password ? 'not-allowed' : 'pointer',
              boxShadow: loading || !emailValid || !password ? 'none' : '0 4px 12px rgba(30, 154, 128, 0.2)',
              transform: loading || !emailValid || !password ? 'none' : 'translateY(0)',
              marginTop: '40px'
            }}
            onMouseEnter={(e) => {
              if (!loading && emailValid && password) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(30, 154, 128, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && emailValid && password) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 154, 128, 0.2)'
              }
            }}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign in</span>
                <LogIn size={16} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p style={{ fontSize: '14px', fontWeight: 400, color: '#8B8B8B' }}>
            Don't have an account?{' '}
            <Link 
              href="/signup" 
              style={{ 
                color: '#1E9A80', 
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'all 0.2s ease'
              }}
              className="hover:underline"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#16a085'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#1E9A80'
              }}
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

