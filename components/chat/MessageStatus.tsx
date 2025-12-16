import React from 'react'
import { Check, CheckCheck } from 'lucide-react'

interface MessageStatusProps {
  isOwn: boolean
  deliveredAt?: string | null
  isRead?: boolean | null
}

export function MessageStatus({ isOwn, deliveredAt, isRead }: MessageStatusProps) {
  if (!isOwn) return null

  if (isRead) {
    return (
      <CheckCheck style={{ width: '12px', height: '12px', color: '#1E9A80', flexShrink: 0 }} />
    )
  }

  if (deliveredAt) {
    return (
      <CheckCheck style={{ width: '12px', height: '12px', color: '#1E9A80', flexShrink: 0 }} />
    )
  }

  return (
    <Check style={{ width: '12px', height: '12px', color: '#1E9A80', flexShrink: 0 }} />
  )
}


