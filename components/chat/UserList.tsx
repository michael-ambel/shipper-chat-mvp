'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  isAI: boolean
  lastSeen: string | null
}

interface UserListProps {
  onlineUsers: string[]
  onSelectUser: (userId: string) => void
  selectedUserId: string | null
  currentUserId?: string | null
}

export default function UserList({ onlineUsers, onSelectUser, selectedUserId, currentUserId }: UserListProps) {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
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

  const isOnline = (userId: string) => onlineUsers.includes(userId)

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
      <div className="w-full border-r border-black bg-white p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto mb-3"></div>
          <p className="text-gray-600">Loading users...</p>
        </div>
      </div>
    )
  }

  const otherOnlineCount = onlineUsers.filter(id => id !== currentUserId).length

  return (
    <div className="w-full border-r border-black bg-white flex flex-col">
      <div className="p-4 border-b border-black">
        <h2 className="text-xl font-bold text-black">Messages</h2>
        <p className="text-sm text-gray-600 mt-1">
          {otherOnlineCount} online
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <div className="p-4 text-center text-gray-600">
            No users found
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={() => onSelectUser(user.id)}
                className={`w-full p-4 flex items-center gap-3 hover:bg-gray-100 transition-colors ${
                  selectedUserId === user.id ? 'bg-gray-100' : ''
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-black text-white flex items-center justify-center font-medium">
                    {getInitials(user.name)}
                  </div>
                  <div
                    className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                      isOnline(user.id) ? 'bg-green-500' : 'bg-gray-400'
                    }`}
                  />
                </div>
                <div className="flex-1 text-left">
                  <div className="font-medium text-black">{user.name}</div>
                  <div className="text-xs text-gray-500 truncate">
                    {isOnline(user.id) 
                      ? 'Online' 
                      : `Last seen ${formatLastSeen(user.lastSeen)}`
                    }
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

