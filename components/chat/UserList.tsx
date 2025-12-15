'use client'

import { useEffect, useState } from 'react'

interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  isAI: boolean
}

interface UserListProps {
  onlineUsers: string[]
  onSelectUser: (userId: string) => void
  selectedUserId: string | null
}

export default function UserList({ onlineUsers, onSelectUser, selectedUserId }: UserListProps) {
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
      console.error('Failed to fetch users:', error)
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

  if (loading) {
    return (
      <div className="w-80 border-r border-black bg-white p-4">
        <div className="text-center text-gray-600">Loading users...</div>
      </div>
    )
  }

  return (
    <div className="w-80 border-r border-black bg-white flex flex-col">
      <div className="p-4 border-b border-black">
        <h2 className="text-xl font-bold text-black">Messages</h2>
        <p className="text-sm text-gray-600 mt-1">
          {onlineUsers.length} online
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
                  <div className="text-sm text-gray-600 truncate">{user.email}</div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

