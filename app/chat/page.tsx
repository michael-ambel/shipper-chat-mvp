'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import UserList from '@/components/chat/UserList'
import ChatWindow from '@/components/chat/ChatWindow'

export default function ChatPage() {
  const router = useRouter()
  const [token, setToken] = useState<string | null>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null)
  const [users, setUsers] = useState<any[]>([])

  const { socket, isConnected, onlineUsers } = useSocket(token)

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  const fetchCurrentUser = async () => {
    try {
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (response.ok) {
        setCurrentUser(data.user)
        let authToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('auth-token='))
          ?.split('=')[1]
        
        if (!authToken) {
          authToken = localStorage.getItem('auth-token') || undefined
        }
        
        setToken(authToken || null)
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error)
      router.push('/login')
    }
  }

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      if (response.ok) {
        setUsers(data.users)
      }
    } catch (error) {
      console.error('Failed to fetch users:', error)
    }
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    const user = users.find(u => u.id === userId)
    setSelectedUserName(user?.name || null)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('auth-token')
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="border-b border-black bg-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-black">Chat MVP</h1>
          {currentUser && (
            <p className="text-sm text-gray-600">
              Welcome, {currentUser.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 border border-black rounded-full hover:bg-gray-100 transition-colors text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <UserList
          onlineUsers={onlineUsers}
          onSelectUser={handleSelectUser}
          selectedUserId={selectedUserId}
        />
        <ChatWindow
          selectedUserId={selectedUserId}
          selectedUserName={selectedUserName}
        />
      </div>
    </div>
  )
}
