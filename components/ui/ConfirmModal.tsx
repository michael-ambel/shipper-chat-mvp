'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  variant?: 'danger' | 'warning'
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel()
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="w-full max-w-[280px] mx-4 rounded-xl shadow-lg"
        style={{ backgroundColor: '#FFFFFF' }}
      >
        <div className="p-4">
          {/* Icon + Title row */}
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: variant === 'danger' ? '#FEE2E2' : '#FEF3C7',
              }}
            >
              <AlertTriangle
                size={16}
                color={variant === 'danger' ? '#EF4444' : '#F59E0B'}
              />
            </div>
            <h3 style={{ fontSize: '14px', fontWeight: 500, color: '#111625' }}>
              {title}
            </h3>
          </div>

          {/* Message */}
          <p style={{ fontSize: '12px', color: '#8B8B8B', lineHeight: '16px', marginBottom: '16px' }}>
            {message}
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="flex-1 py-2 rounded-lg transition-colors hover:bg-gray-200"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#374151',
                backgroundColor: '#F3F3EE',
              }}
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-2 rounded-lg transition-colors"
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: '#FFFFFF',
                backgroundColor: variant === 'danger' ? '#EF4444' : '#F59E0B',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  variant === 'danger' ? '#DC2626' : '#D97706'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  variant === 'danger' ? '#EF4444' : '#F59E0B'
              }}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

