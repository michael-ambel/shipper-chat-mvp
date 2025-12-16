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
  const [showChat, setShowChat] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const { socket, isConnected, onlineUsers } = useSocket(token)

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

  // Listen for unread count changes via socket
  useEffect(() => {
    if (!socket) return

    const handleUnreadCountChanged = () => {
      setRefreshTrigger(prev => prev + 1)
    }

    socket.on('unread_count_changed', handleUnreadCountChanged)

    return () => {
      socket.off('unread_count_changed', handleUnreadCountChanged)
    }
  }, [socket])

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
    }
  }

  const handleUnreadChange = () => {
    setRefreshTrigger(prev => prev + 1)
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId)
    const user = users.find(u => u.id === userId)
    setSelectedUserName(user?.name || null)
    setShowChat(true)
  }

  const handleBackToUsers = () => {
    setShowChat(false)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      localStorage.removeItem('auth-token')
      router.push('/login')
    } catch (error) {
    }
  }

  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="border-b border-black bg-white p-3 sm:p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-black">Shipper Chat</h1>
          <p className="text-xs sm:text-sm text-gray-600">
            Welcome, {currentUser.name}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2">
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
            className="px-3 sm:px-4 py-2 border border-black rounded-full hover:bg-gray-100 transition-colors text-xs sm:text-sm font-medium"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className={`${showChat ? 'hidden sm:flex' : 'flex'} w-full sm:w-80`}>
          <UserList
            onlineUsers={onlineUsers}
            onSelectUser={handleSelectUser}
            selectedUserId={selectedUserId}
            currentUserId={currentUser?.id}
            refreshTrigger={refreshTrigger}
          />
        </div>
        <div className={`${showChat ? 'flex' : 'hidden sm:flex'} flex-1`}>
          <ChatWindow
            selectedUserId={selectedUserId}
            selectedUserName={selectedUserName}
            currentUserId={currentUser?.id || null}
            socket={socket}
            onBack={handleBackToUsers}
            isMobile={showChat}
            onUnreadChange={handleUnreadChange}
          />
        </div>
      </div>
    </div>
  )
}
