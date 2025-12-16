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
      <div className="w-full bg-gray-100 rounded-2xl p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto mb-3"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  const aiUsersCount = users.filter(u => u.isAI).length
  const otherOnlineCount = onlineUsers.filter(id => id !== currentUserId).length + aiUsersCount

  return (
    <div className="w-full bg-gray-100 rounded-2xl flex flex-col overflow-hidden">
      <div className="p-4 pb-3">
        <h2 className="text-xl font-bold text-black">Messages</h2>
        <p className="text-sm text-gray-500 mt-1">
          {otherOnlineCount} online
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {users.length === 0 ? (
          <div className="p-4 text-center text-gray-600">
            No users found
          </div>
        ) : (
          <div className="space-y-1">
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
                className={`w-full p-3 flex items-center gap-3 rounded-xl transition-all ${
                  selectedUserId === user.id 
                    ? 'bg-white shadow-sm' 
                    : 'hover:bg-white/50'
                }`}
              >
                <div className="relative">
                  {user.isAI ? (
                    <>
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center">
                        <BotMessageSquare className="w-6 h-6" />
                      </div>
                      <div className="absolute bottom-0 right-0 w-3 h-3 min-w-[12px] min-h-[12px] rounded-full border-2 border-white bg-green-500 flex-shrink-0" />
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-medium">
                        {getInitials(user.name)}
                      </div>
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 min-w-[12px] min-h-[12px] rounded-full border-2 border-white flex-shrink-0 ${
                          isOnline(user.id, user.isAI) ? 'bg-green-500' : 'bg-gray-400'
                        }`}
                      />
                    </>
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-black">{user.name}</span>
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {isOnline(user.id, user.isAI) 
                      ? 'Online' 
                      : `Last seen ${formatLastSeen(user.lastSeen)}`
                    }
                  </div>
                </div>
                {typeof user.unreadCount === 'number' && user.unreadCount > 0 && (
                  <div className="ml-2 flex items-center justify-center min-w-[20px] w-auto h-5 px-1.5 rounded-full bg-green-500 text-white text-xs font-semibold flex-shrink-0">
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

