'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
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
        if (response.status === 401) {
          toast.error('Your session has expired. Please sign in again.')
        } else {
          toast.error(data.error || 'Failed to load session. Please sign in again.')
        }
        router.push('/login')
      }
    } catch (error) {
      toast.error('Unable to verify session. Please sign in again.')
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

  const selectedUser = users.find(u => u.id === selectedUserId)

  const handleBackToUsers = () => {
    setShowChat(false)
  }

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        toast.error(data.error || 'Logout failed. Please try again.')
        return
      }
      localStorage.removeItem('auth-token')
      toast.success('Logged out successfully')
      router.push('/login')
    } catch (error) {
      toast.error('Logout failed. Please try again.')
    }
  }

  if (!currentUser) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#F3F3EE' }}>
      <header className="p-3 sm:p-4 flex justify-between items-center" style={{ backgroundColor: '#F3F3EE' }}>
        <div>
          <h1 style={{ fontSize: '14px', fontWeight: 500, color: '#09090B', lineHeight: '20px' }}>Shipper Chat</h1>
          <p style={{ fontWeight: 400, color: '#8B8B8B', lineHeight: '150%', letterSpacing: '-0.01em', fontSize: '14px' }}>
            Welcome, {currentUser.name}
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden sm:flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: isConnected ? '#38C793' : '#8B8B8B' }}
            />
            <span style={{ fontSize: '14px', fontWeight: 400, color: '#8B8B8B', lineHeight: '150%', letterSpacing: '-0.01em' }}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="transition-colors flex items-center justify-center"
            style={{
              padding: '8px 16px',
              backgroundColor: '#1E9A80',
              borderRadius: '8px',
              color: '#FFFFFF',
              fontSize: '14px',
              fontWeight: 500,
              height: '32px',
              lineHeight: '20px'
            }}
          >
            Logout
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden gap-3 px-3 sm:px-4 pb-3 sm:pb-4" style={{ gap: '12px' }}>
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
            isAI={selectedUser?.isAI}
            onlineUsers={onlineUsers}
          />
        </div>
      </div>
    </div>
  )
}
