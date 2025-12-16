import React from 'react'

interface MessageStatusProps {
  isOwn: boolean
  deliveredAt?: string | null
  isRead?: boolean | null
}

export function MessageStatus({ isOwn, deliveredAt, isRead }: MessageStatusProps) {
  if (!isOwn) return null

  if (isRead) {
    return (
      <span className="ml-2 text-[10px] sm:text-xs text-gray-400">
        <span className="text-green-500">✓✓</span> Read
      </span>
    )
  }

  if (deliveredAt) {
    return (
      <span className="ml-2 text-[10px] sm:text-xs text-gray-400">
        <span className="text-gray-400">✓✓</span> Delivered
      </span>
    )
  }

  return (
    <span className="ml-2 text-[10px] sm:text-xs text-gray-400">
      <span className="text-gray-400">✓</span> Sent
    </span>
  )
}


