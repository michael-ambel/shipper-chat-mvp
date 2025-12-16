'use client'

import Link from 'next/link'
import { LogIn, UserPlus } from 'lucide-react'

export default function Home() {
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
          <h1 style={{ 
            fontSize: '20px', 
            fontWeight: 500, 
            color: '#09090B', 
            lineHeight: '20px',
            marginBottom: '4px'
          }}>
            Shipper Chat
          </h1>
          <p style={{ 
            fontSize: '14px', 
            fontWeight: 400, 
            color: '#8B8B8B',
            lineHeight: '20px'
          }}>
            Real-time messaging platform
          </p>
        </div>

        <div className="space-y-4" style={{ marginTop: '40px' }}>
          <Link
            href="/login"
            className="w-full relative flex items-center justify-center gap-2 transition-all group"
            style={{
              height: '40px',
              padding: '0 16px',
              backgroundColor: '#1E9A80',
              borderRadius: '9999px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
              boxShadow: '0 4px 12px rgba(30, 154, 128, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(30, 154, 128, 0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(30, 154, 128, 0.2)'
            }}
          >
            <span>Sign in</span>
            <LogIn size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>

          <Link
            href="/signup"
            className="w-full relative flex items-center justify-center gap-2 transition-all group"
            style={{
              height: '40px',
              padding: '0 16px',
              backgroundColor: '#FFFFFF',
              border: '1px solid #E8E5DF',
              borderRadius: '9999px',
              color: '#09090B',
              fontSize: '14px',
              fontWeight: 500,
              textDecoration: 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.borderColor = '#1E9A80'
              e.currentTarget.style.backgroundColor = '#F0FDF4'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.borderColor = '#E8E5DF'
              e.currentTarget.style.backgroundColor = '#FFFFFF'
            }}
          >
            <span>Create account</span>
            <UserPlus size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </div>
  )
}
