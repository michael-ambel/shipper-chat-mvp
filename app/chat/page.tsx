'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Sparkle, House, MessageCircle, Compass, Folder, Images, Search, Bell, Settings, ChevronDown, Command } from 'lucide-react'
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
  const [showDropdown, setShowDropdown] = useState(false)
  const [targetMessageId, setTargetMessageId] = useState<string | null>(null)

  const { socket, isConnected, onlineUsers } = useSocket(token)

  useEffect(() => {
    fetchCurrentUser()
    fetchUsers()
  }, [])

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

  const handleSelectUser = (userId: string, messageId?: string) => {
    setSelectedUserId(userId)
    const user = users.find(u => u.id === userId)
    setSelectedUserName(user?.name || null)
    setTargetMessageId(messageId || null)
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
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#F3F3EE' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 mx-auto mb-3" style={{ borderColor: '#E8E5DF', borderTopColor: '#1E9A80' }}></div>
          <p style={{ fontSize: '14px', fontWeight: 400, color: '#8B8B8B', lineHeight: '20px' }}>Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex" style={{ backgroundColor: '#F3F3EE' }}>
      <div 
        className="hidden sm:flex flex-col justify-between"
        style={{
          width: '76px',
          height: '100%',
          paddingTop: '24px',
          paddingBottom: '24px',
          paddingLeft: '16px',
          paddingRight: '16px',
        }}
      >
        {/* Top Container - Logo and Navigation Icons */}
        <div className="flex flex-col items-center" style={{ gap: '32px' }}>
          <img 
            src="/logo.png" 
            alt="Logo"
            style={{
              width: '44px',
              height: '44px',
            }}
          />
          <div className="flex flex-col items-center justify-between" style={{ gap: '8px' }}>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
              style={{ width: '44px', height: '44px', borderRadius: '12px' }}
              onClick={() => toast.info('Only Chat page is active')}
            >
              <House size={16} color="#151515" />
            </div>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-80 transition-opacity"
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                backgroundColor: '#F0FDF4',
                border: '1px solid #1E9A80',
              }}
            >
              <MessageCircle size={16} color="#151515" />
            </div>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
              style={{ width: '44px', height: '44px', borderRadius: '12px' }}
              onClick={() => toast.info('Only Chat page is active')}
            >
              <Compass size={16} color="#151515" />
            </div>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
              style={{ width: '44px', height: '44px', borderRadius: '12px' }}
              onClick={() => toast.info('Only Chat page is active')}
            >
              <Folder size={16} color="#151515" />
            </div>
            <div 
              className="flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
              style={{ width: '44px', height: '44px', borderRadius: '12px' }}
              onClick={() => toast.info('Only Chat page is active')}
            >
              <Images size={16} color="#151515" />
            </div>
          </div>
        </div>

        {/* Bottom Container - Sparkle and Profile */}
        <div className="flex flex-col items-center" style={{ gap: '24px' }}>
          <div 
            className="flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
            style={{ width: '44px', height: '44px', borderRadius: '12px' }}
            onClick={() => toast.info('Only Chat page is active')}
          >
            <Sparkle size={16} color="#151515" />
          </div>
          <img 
            src="/profile_picture.png" 
            alt="Profile"
            className="object-cover"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
            }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden" style={{ padding: '12px', gap: '12px' }}>
        {/* Top - Header with white background */}
        <header 
          className="flex justify-between items-center"
          style={{ 
            height: '56px',
            paddingTop: '12px',
            paddingRight: '24px',
            paddingBottom: '12px',
            paddingLeft: '24px',
            gap: '24px',
            backgroundColor: '#FFFFFF',
            borderRadius: '16px',
          }}
        >
          {/* Left - Message icon and text */}
          <div className="flex items-center" style={{ height: '20px', gap: '8px' }}>
            <MessageCircle size={18} color="#151515" />
            <span style={{ fontSize: '14px', fontWeight: 500, color: '#151515', lineHeight: '20px' }}>Message</span>
          </div>

          {/* Right - Icons and Profile */}
          <div className="flex items-center" style={{ gap: '16px' }}>
            {/* Search Input */}
            <div 
              className="flex items-center"
              style={{
                width: '300px',
                height: '32px',
                paddingTop: '10px',
                paddingRight: '4px',
                paddingBottom: '10px',
                paddingLeft: '10px',
                gap: '8px',
                borderRadius: '10px',
                border: '1px solid #E8E5DF',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Search size={16} color="#8796AF" />
              <input 
                type="text"
                placeholder="Search"
                className="flex-1 outline-none placeholder:text-[#8796AF]"
                style={{
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#404040',
                  backgroundColor: 'transparent',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    toast.info('Coming soon')
                  }
                }}
              />
              <div 
                className="flex items-center justify-center cursor-pointer hover:opacity-70 transition-opacity"
                style={{
                  height: '24px',
                  paddingTop: '5px',
                  paddingRight: '6px',
                  paddingBottom: '5px',
                  paddingLeft: '6px',
                  gap: '4px',
                  borderRadius: '6px',
                  backgroundColor: '#F3F3EE',
                }}
                onClick={() => toast.info('Coming soon')}
              >
                <Command size={12} color="#404040" />
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#404040' }}>+</span>
                <span style={{ fontSize: '12px', fontWeight: 500, color: '#404040' }}>K</span>
              </div>
            </div>
            
            <button 
              className="flex items-center justify-center transition-opacity hover:opacity-70"
              style={{
                width: '32px',
                height: '32px',
                gap: '4px',
                borderRadius: '8px',
                border: '1px solid #E8E5DF',
                backgroundColor: '#FFFFFF',
              }}
              onClick={() => toast.info('Coming soon')}
            >
              <Bell size={16} color="#262626" />
            </button>
            <button 
              className="flex items-center justify-center transition-opacity hover:opacity-70"
              style={{
                width: '32px',
                height: '32px',
                gap: '4px',
                borderRadius: '8px',
                border: '1px solid #E8E5DF',
                backgroundColor: '#FFFFFF',
              }}
              onClick={() => toast.info('Coming soon')}
            >
              <Settings size={16} color="#262626" />
            </button>

            {/* Separator */}
            <div 
              style={{
                width: '0px',
                height: '20px',
                borderLeft: '1px solid #E8E5DF',
              }}
            />
            
            {/* Profile Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center transition-opacity hover:opacity-80"
                style={{ gap: '8px' }}
              >
                <img 
                  src="/profile_picture.png" 
                  alt="Profile"
                  className="object-cover"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                  }}
                />
                <ChevronDown size={16} color="#151515" />
              </button>
              
              {/* Dropdown Menu */}
              {showDropdown && (
                <div 
                  className="absolute right-0 mt-2 shadow-lg"
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '8px',
                    border: '1px solid #E8E5DF',
                    padding: '8px 0',
                    minWidth: '150px',
                    zIndex: 50,
                  }}
                >
                  <div 
                    style={{ 
                      padding: '8px 16px', 
                      borderBottom: '1px solid #E8E5DF',
                    }}
                  >
                    <p style={{ fontSize: '14px', fontWeight: 500, color: '#151515' }}>{currentUser.name}</p>
                    <p style={{ fontSize: '12px', color: '#8B8B8B' }}>{currentUser.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowDropdown(false)
                      handleLogout()
                    }}
                    className="w-full text-left transition-colors hover:bg-gray-50"
                    style={{
                      padding: '8px 16px',
                      fontSize: '14px',
                      color: '#151515',
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Bottom - User List and Chat Window Container */}
        <div 
          className="flex-1 flex overflow-hidden"
          style={{ gap: '12px' }}
        >
          <div className={`${showChat ? 'hidden sm:flex' : 'flex'}`}>
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
              targetMessageId={targetMessageId}
              onTargetMessageScrolled={() => setTargetMessageId(null)}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
