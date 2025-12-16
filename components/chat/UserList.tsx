'use client'

import { useEffect, useState } from 'react'
import { BotMessageSquare } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  isAI: boolean
  lastSeen: string | null
  unreadCount?: number
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
      <div className="w-full p-4 flex items-center justify-center" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 mx-auto mb-3" style={{ borderColor: '#1E9A80', borderTopColor: 'transparent' }}></div>
          <p style={{ fontWeight: 400, color: '#8B8B8B', lineHeight: '150%', letterSpacing: '-0.01em' }}>Loading users...</p>
        </div>
      </div>
    )
  }

  const aiUsersCount = users.filter(u => u.isAI).length
  const otherOnlineCount = onlineUsers.filter(id => id !== currentUserId).length + aiUsersCount

  return (
    <div className="w-full flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px' }}>
      <div className="p-4 pb-3">
        <h2 className="text-black" style={{ fontWeight: 500, color: '#09090B', fontSize: '14px', lineHeight: '20px' }}>Messages</h2>
        <p className="mt-1" style={{ fontWeight: 400, color: '#8B8B8B', lineHeight: '150%', letterSpacing: '-0.01em' }}>
          {otherOnlineCount} online
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
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
                  height: '64px',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: selectedUserId === user.id ? '#F3F3EE' : 'transparent',
                  gap: '12px'
                }}
              >
                <div className="relative" style={{ flexShrink: 0 }}>
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
                <div className="flex-1 text-left flex flex-col justify-center" style={{ height: '40px' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontWeight: 500, color: '#1C1C1C', fontSize: '14px', lineHeight: '20px' }}>{user.name}</span>
                  </div>
                  <div className="truncate" style={{ fontSize: '12px', fontWeight: 400, color: '#8B8B8B', lineHeight: '16px' }}>
                    {isOnline(user.id, user.isAI) 
                      ? 'Online' 
                      : `Last seen ${formatLastSeen(user.lastSeen)}`
                    }
                  </div>
                </div>
                {typeof user.unreadCount === 'number' && user.unreadCount > 0 && (
                  <div className="flex items-center justify-center min-w-[20px] w-auto h-5 px-1.5 rounded-full text-white text-xs font-semibold flex-shrink-0" style={{ backgroundColor: '#1E9A80' }}>
                    {user.unreadCount}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

