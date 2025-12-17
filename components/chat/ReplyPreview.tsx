'use client'

import { X, Reply } from 'lucide-react'

interface ReplyPreviewProps {
  replyTo: {
    id: string
    content: string
    senderId: string
    sender: {
      id: string
      name: string
    }
  }
  currentUserId: string
  onCancel: () => void
}

export default function ReplyPreview({ replyTo, currentUserId, onCancel }: ReplyPreviewProps) {
  const isOwnMessage = replyTo.senderId === currentUserId
  const senderName = isOwnMessage ? 'You' : replyTo.sender.name
  const truncatedContent = replyTo.content.length > 100 
    ? replyTo.content.substring(0, 100) + '...' 
    : replyTo.content

  return (
    <div 
      className="flex items-center"
      style={{
        padding: '8px 12px',
        backgroundColor: '#F7F9FB',
        borderLeft: '3px solid #1E9A80',
        borderRadius: '0 8px 8px 0',
        gap: '8px',
      }}
    >
      <Reply size={16} style={{ color: '#1E9A80', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: '#1E9A80', lineHeight: '16px' }}>
          Replying to {senderName}
        </div>
        <div 
          style={{ 
            fontSize: '12px', 
            color: '#6B7280', 
            lineHeight: '16px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {truncatedContent}
        </div>
      </div>
      <button
        onClick={onCancel}
        className="flex items-center justify-center hover:bg-gray-200 transition-colors"
        style={{
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          flexShrink: 0,
        }}
      >
        <X size={14} style={{ color: '#6B7280' }} />
      </button>
    </div>
  )
}

