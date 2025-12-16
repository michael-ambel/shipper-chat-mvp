'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { UserPlus, User, Mail, Lock, CheckCircle2 } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [focusedField, setFocusedField] = useState<string | null>(null)
  const [emailValid, setEmailValid] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(value)
  }

  const calculatePasswordStrength = (value: string) => {
    let strength = 0
    if (value.length >= 6) strength += 1
    if (value.length >= 8) strength += 1
    if (/[A-Z]/.test(value)) strength += 1
    if (/[0-9]/.test(value)) strength += 1
    if (/[^A-Za-z0-9]/.test(value)) strength += 1
    return Math.min(strength, 4)
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setEmail(value)
    setEmailValid(value.length > 0 && validateEmail(value))
  }

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPassword(value)
    setPasswordStrength(calculatePasswordStrength(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedPassword = password.trim()

    if (!trimmedName || !trimmedEmail || !trimmedPassword) {
      const message = 'Name, email, and password are required'
      setError(message)
      toast.error(message)
      return
    }

    if (trimmedPassword.length < 6) {
      const message = 'Password must be at least 6 characters'
      setError(message)
      toast.error(message)
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password: trimmedPassword }),
      })

      const data = await response.json()

      if (!response.ok) {
        const message = data.error || 'Signup failed'
        setError(message)
        toast.error(message)
        return
      }

      if (data.token) {
        localStorage.setItem('auth-token', data.token)
      }

      toast.success('Account created successfully')
      router.push('/chat')
    } catch (err) {
      const message = 'Something went wrong. Please try again.'
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const isFormValid = name.length > 0 && emailValid && password.length >= 6

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
            Create your account
          </h2>
          <p style={{ 
            fontSize: '14px', 
            fontWeight: 400, 
            color: '#8B8B8B',
            lineHeight: '20px'
          }}>
            Join us and start your journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label 
              htmlFor="name" 
              style={{ 
                fontSize: '14px', 
                fontWeight: 500, 
                color: '#09090B',
                lineHeight: '20px',
                display: 'block',
                marginBottom: '8px'
              }}
            >
              Full name
            </label>
            <div className="relative">
              <div 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none transition-colors"
                style={{ color: focusedField === 'name' ? '#1E9A80' : '#8B8B8B' }}
              >
                <User size={16} />
              </div>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={() => setFocusedField('name')}
                onBlur={() => setFocusedField(null)}
                style={{
                  width: '100%',
                  height: '40px',
                  paddingLeft: '44px',
                  paddingRight: '16px',
                  border: focusedField === 'name' ? '2px solid #1E9A80' : '1px solid #E8E5DF',
                  borderRadius: '9999px',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#404040',
                  backgroundColor: focusedField === 'name' ? '#F0FDF4' : '#FFFFFF',
                  transition: 'all 0.2s ease'
                }}
                className="focus:outline-none"
              />
            </div>
          </div>

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
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={handlePasswordChange}
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
            {password.length > 0 && (
              <div className="mt-3 auth-check-slide">
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    style={{
                      flex: 1,
                      height: '4px',
                      backgroundColor: '#E8E5DF',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${(passwordStrength / 4) * 100}%`,
                        backgroundColor: passwordStrength <= 1 ? '#ef4444' : passwordStrength <= 2 ? '#f59e0b' : passwordStrength <= 3 ? '#3b82f6' : '#1E9A80',
                        transition: 'all 0.3s ease',
                        borderRadius: '2px'
                      }}
                    />
                  </div>
                  <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 500, 
                    color: passwordStrength <= 1 ? '#ef4444' : passwordStrength <= 2 ? '#f59e0b' : passwordStrength <= 3 ? '#3b82f6' : '#1E9A80',
                    minWidth: '50px',
                    textAlign: 'right'
                  }}>
                    {passwordStrength === 0 ? 'Weak' : passwordStrength <= 1 ? 'Fair' : passwordStrength <= 2 ? 'Good' : passwordStrength <= 3 ? 'Strong' : 'Very Strong'}
                  </span>
                </div>
                <p style={{ 
                  fontSize: '12px', 
                  fontWeight: 400, 
                  color: '#8B8B8B',
                  lineHeight: '16px'
                }}>
                  {password.length < 6 ? 'Must be at least 6 characters' : 'Password strength indicator'}
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !isFormValid}
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
              cursor: loading || !isFormValid ? 'not-allowed' : 'pointer',
              boxShadow: loading || !isFormValid ? 'none' : '0 4px 12px rgba(30, 154, 128, 0.2)',
              transform: loading || !isFormValid ? 'none' : 'translateY(0)',
              marginTop: '40px'
            }}
            onMouseEnter={(e) => {
              if (!loading && isFormValid) {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 6px 16px rgba(30, 154, 128, 0.3)'
              }
            }}
            onMouseLeave={(e) => {
              if (!loading && isFormValid) {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 154, 128, 0.2)'
              }
            }}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span>Creating account...</span>
              </>
            ) : (
              <>
                <span>Create account</span>
                <UserPlus size={16} className="transition-transform group-hover:translate-x-1" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p style={{ fontSize: '14px', fontWeight: 400, color: '#8B8B8B' }}>
            Already have an account?{' '}
            <Link 
              href="/login" 
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
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

