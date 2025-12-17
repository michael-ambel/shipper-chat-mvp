'use client'

import { useEffect, useState } from 'react'
import { BotMessageSquare, PencilLine, Search, Filter, MessageCircle, Check, CheckCheck } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  isAI: boolean
  lastSeen: string | null
  unreadCount?: number
  lastMessage?: string | null
  lastMessageTime?: string | null
  lastMessageSenderId?: string | null
  lastMessageIsRead?: boolean
  lastMessageDeliveredAt?: string | null
}

interface UserListProps {
  onlineUsers: string[]
  onSelectUser: (userId: string) => void
  selectedUserId: string | null
  currentUserId?: string | null
  refreshTrigger?: number
}

export default function UserList({ onlineUsers, onSelectUser, selectedUserId, currentUserId, refreshTrigger }: UserListProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  useEffect(() => {
    if (refreshTrigger) {
      fetchUsers()
    }
  }, [refreshTrigger])

  const fetchUsers = async () => {
    try {
      // Add timestamp to prevent caching
      const response = await fetch(`/api/users?t=${Date.now()}`)
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users)
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const isOnline = (userId: string, isAI: boolean) => {
    if (isAI) return true
    return onlineUsers.includes(userId)
  }

  const formatLastSeen = (lastSeen: string | null | undefined) => {
    if (!lastSeen) return 'recently'
    
    const now = new Date()
    const seen = new Date(lastSeen)
    const diffMs = now.getTime() - seen.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return seen.toLocaleDateString()
  }

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center" 
        style={{ 
          width: '400px', 
          height: '100%', 
          backgroundColor: '#FFFFFF', 
          borderRadius: '24px',
          padding: '24px',
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 mx-auto mb-3" style={{ borderColor: '#E8E5DF', borderTopColor: '#1E9A80' }}></div>
          <p style={{ fontSize: '12px', fontWeight: 400, color: '#8B8B8B', lineHeight: '16px' }}>Loading users...</p>
        </div>
      </div>
    )
  }

  const aiUsersCount = users.filter(u => u.isAI).length
  const otherOnlineCount = onlineUsers.filter(id => id !== currentUserId).length + aiUsersCount

  return (
    <div 
      className="flex flex-col overflow-hidden" 
      style={{ 
        width: '400px',
        height: '100%',
        backgroundColor: '#FFFFFF', 
        borderRadius: '24px',
        padding: '24px',
        gap: '24px',
      }}
    >
      {/* Header Row - Title and New Message Button */}
      <div className="flex items-center justify-between">
        <h2 style={{ fontWeight: 600, color: '#09090B', fontSize: '20px', lineHeight: '30px', letterSpacing: '0%' }}>All Message</h2>
        <button
          className="flex items-center justify-center transition-colors hover:opacity-90"
          style={{
            height: '32px',
            padding: '8px 12px',
            backgroundColor: '#1E9A80',
            borderRadius: '8px',
            border: '1px solid #1E9A80',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
        >
          <PencilLine size={14} color="#FFFFFF" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '14px', fontWeight: 500, lineHeight: '20px', letterSpacing: '-0.6%', textAlign: 'center' }}>New Message</span>
        </button>
      </div>

      {/* Search Row - Input and Filter Button */}
      <div className="flex items-center" style={{ gap: '8px' }}>
        <div className="flex-1 relative">
          <Search 
            size={16} 
            color="#8B8B8B" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Search in message"
            className="w-full outline-none"
            style={{
              height: '40px',
              border: '1px solid #E8E5DF',
              borderRadius: '10px',
              paddingLeft: '36px',
              paddingRight: '12px',
              color: '#404040',
              fontSize: '14px',
              fontWeight: 400,
            }}
          />
        </div>
        <button
          className="flex items-center justify-center transition-colors hover:opacity-80"
          style={{
            width: '40px',
            height: '40px',
            border: '1px solid #E8E5DF',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Filter size={18} color="#151515" />
        </button>
      </div>

      {/* Users List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        {users.length === 0 ? (
          <div className="p-4 text-center" style={{ fontWeight: 400, color: '#8B8B8B', lineHeight: '150%', letterSpacing: '-0.01em' }}>
            No users found
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => {
                  onSelectUser(user.id)
                  // Optimistically clear unread count when opening the chat
                  if (user.unreadCount && user.unreadCount > 0) {
                    setUsers(prev =>
                      prev.map(u =>
                        u.id === user.id ? { ...u, unreadCount: 0 } : u
                      )
                    )
                  }
                }}
                className="w-full flex items-center transition-all"
                style={{
                  width: '100%',
                  height: '64px',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: selectedUserId === user.id ? '#F3F3EE' : 'transparent',
                  gap: '8px'
                }}
              >
                {/* Unread Indicator - Left Side (separate) */}
                {typeof user.unreadCount === 'number' && user.unreadCount > 0 && (
                  <div 
                    className="flex flex-col items-center justify-center"
                    style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '12px',
                      padding: '12px',
                      gap: '8px',
                      flexShrink: 0,
                      backgroundColor: '#1E9A80',
                    }} 
                  >
                    <MessageCircle size={18} color="#FFFFFF" />
                    <span style={{ 
                      fontWeight: 500, 
                      fontSize: '12px', 
                      lineHeight: '16px', 
                      letterSpacing: '0px',
                      color: '#FFFFFF',
                    }}>
                      Unread
                    </span>
                  </div>
                )}

                {/* User Content Wrapper */}
                <div className="flex items-center" style={{ flex: 1, gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                  {/* User Icon */}
                  <div className="relative" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                    {user.isAI ? (
                      <>
                        <div className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center" style={{ width: '40px', height: '40px' }}>
                          <BotMessageSquare className="w-5 h-5" />
                        </div>
                        <div className="absolute bottom-0 right-0 w-3 h-3 min-w-[12px] min-h-[12px] rounded-full border-2 border-white flex-shrink-0" style={{ backgroundColor: '#38C793' }} />
                      </>
                    ) : (
                      <>
                        <div className="rounded-full text-white flex items-center justify-center font-medium" style={{ width: '40px', height: '40px', backgroundColor: '#F7F9FB', color: '#111625' }}>
                          {getInitials(user.name)}
                        </div>
                        <div
                          className="absolute bottom-0 right-0 w-3 h-3 min-w-[12px] min-h-[12px] rounded-full border-2 border-white flex-shrink-0"
                          style={{ backgroundColor: isOnline(user.id, user.isAI) ? '#38C793' : '#8B8B8B' }}
                        />
                      </>
                    )}
                  </div>

                  {/* User Details */}
                  <div 
                    className="text-left flex flex-col justify-center" 
                    style={{ 
                      height: '40px', 
                      gap: '4px', 
                      flex: 1, 
                      minWidth: 0, 
                      overflow: 'hidden' 
                    }}
                  >
                  {/* Row 1: Name and Time */}
                  <div className="flex items-center justify-between" style={{ gap: '8px' }}>
                    <span 
                      style={{ 
                        fontWeight: 500, 
                        color: '#1C1C1C', 
                        fontSize: '14px', 
                        lineHeight: '20px',
                        letterSpacing: '-0.6%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {user.name}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 400, color: '#8B8B8B', lineHeight: '16px', flexShrink: 0 }}>
                      {formatLastSeen(user.lastSeen)}
                    </span>
                  </div>
                  {/* Row 2: Last Message and Read Status */}
                  <div className="flex items-center" style={{ gap: '6px' }}>
                    <span 
                      style={{ 
                        fontSize: '12px', 
                        fontWeight: 400, 
                        color: '#8B8B8B', 
                        lineHeight: '16px',
                        letterSpacing: '0px',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {user.lastMessage && user.lastMessage.trim() ? user.lastMessage : (isOnline(user.id, user.isAI) ? 'Online' : 'Start a conversation')}
                    </span>
                    {/* Read Status Indicator */}
                    {user.lastMessage && user.lastMessage.trim() && (
                      <div style={{ flexShrink: 0 }}>
                        {user.lastMessageSenderId === currentUserId ? (
                          // Sent by current user - show delivery/read status
                          user.lastMessageIsRead ? (
                            <CheckCheck size={12} color="#1E9A80" />
                          ) : user.lastMessageDeliveredAt ? (
                            <CheckCheck size={12} color="#1E9A80" />
                          ) : (
                            <Check size={12} color="#1E9A80" />
                          )
                        ) : (
                          // Received from other user - show single check
                          <Check size={12} color="#1E9A80" />
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}


