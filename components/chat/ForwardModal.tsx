'use client'

import { useState, useEffect } from 'react'
import { X, Search, Forward, Check, BotMessageSquare } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  isAI: boolean
}

interface ForwardModalProps {
  isOpen: boolean
  onClose: () => void
  onForward: (userIds: string[]) => void
  messageContent: string
  currentUserId: string
  isLoading?: boolean
}

export default function ForwardModal({ 
  isOpen, 
  onClose, 
  onForward, 
  messageContent,
  currentUserId,
  isLoading = false,
}: ForwardModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setSelectedUserIds([])
      setSearchQuery('')
    }
  }, [isOpen])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users.filter((u: User) => u.id !== currentUserId))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUserIds(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleForward = () => {
    if (selectedUserIds.length > 0) {
      onForward(selectedUserIds)
    }
  }

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!isOpen) return null

  const truncatedContent = messageContent.length > 80 
    ? messageContent.substring(0, 80) + '...' 
    : messageContent

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-xl"
        style={{ 
          width: '400px', 
          maxHeight: '500px',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div 
          className="flex items-center justify-between"
          style={{ 
            padding: '16px 20px',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <div className="flex items-center" style={{ gap: '8px' }}>
            <Forward size={18} style={{ color: '#1E9A80' }} />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#111625' }}>
              Forward Message
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center hover:bg-gray-100 transition-colors"
            style={{ width: '32px', height: '32px', borderRadius: '50%' }}
          >
            <X size={18} style={{ color: '#6B7280' }} />
          </button>
        </div>

        {/* Message Preview */}
        <div 
          style={{ 
            padding: '12px 20px',
            backgroundColor: '#F7F9FB',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          <div style={{ fontSize: '11px', color: '#6B7280', marginBottom: '4px' }}>
            Message to forward:
          </div>
          <div style={{ fontSize: '13px', color: '#111625', lineHeight: '18px' }}>
            {truncatedContent}
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 20px' }}>
          <div 
            className="flex items-center"
            style={{ 
              backgroundColor: '#F7F9FB',
              borderRadius: '8px',
              padding: '8px 12px',
              gap: '8px',
            }}
          >
            <Search size={16} style={{ color: '#9CA3AF', flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent outline-none"
              style={{ fontSize: '14px', color: '#111625' }}
            />
          </div>
        </div>

        {/* User List */}
        <div 
          className="flex-1 overflow-y-auto"
          style={{ 
            padding: '0 20px',
            maxHeight: '240px',
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center" style={{ padding: '20px' }}>
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1E9A80]" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#6B7280', fontSize: '14px' }}>
              No users found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {filteredUsers.map(user => (
                <button
                  key={user.id}
                  onClick={() => toggleUser(user.id)}
                  className="flex items-center w-full hover:bg-gray-50 transition-colors"
                  style={{ 
                    padding: '10px 12px',
                    borderRadius: '8px',
                    gap: '12px',
                    backgroundColor: selectedUserIds.includes(user.id) ? '#F0FDF4' : 'transparent',
                  }}
                >
                  {/* Avatar */}
                  {user.isAI ? (
                    <div 
                      className="rounded-full flex items-center justify-center"
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        border: '2px solid #1E9A80',
                        flexShrink: 0,
                      }}
                    >
                      <BotMessageSquare className="w-5 h-5" style={{ color: '#1E9A80' }} />
                    </div>
                  ) : (
                    <div 
                      className="rounded-full flex items-center justify-center font-medium"
                      style={{ 
                        width: '36px', 
                        height: '36px', 
                        backgroundColor: '#F7F9FB',
                        color: '#111625',
                        fontSize: '13px',
                        flexShrink: 0,
                      }}
                    >
                      {getInitials(user.name)}
                    </div>
                  )}

                  {/* User Info */}
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: '#111625' }}>
                      {user.name}
                    </div>
                    <div 
                      style={{ 
                        fontSize: '12px', 
                        color: '#6B7280',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {user.email}
                    </div>
                  </div>

                  {/* Checkbox */}
                  <div 
                    className="flex items-center justify-center"
                    style={{ 
                      width: '20px', 
                      height: '20px', 
                      borderRadius: '4px',
                      border: selectedUserIds.includes(user.id) ? 'none' : '2px solid #D1D5DB',
                      backgroundColor: selectedUserIds.includes(user.id) ? '#1E9A80' : 'transparent',
                      flexShrink: 0,
                    }}
                  >
                    {selectedUserIds.includes(user.id) && (
                      <Check size={14} style={{ color: 'white' }} />
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div 
          className="flex items-center justify-between"
          style={{ 
            padding: '16px 20px',
            borderTop: '1px solid #E5E7EB',
          }}
        >
          <span style={{ fontSize: '13px', color: '#6B7280' }}>
            {selectedUserIds.length > 0 
              ? `${selectedUserIds.length} user${selectedUserIds.length > 1 ? 's' : ''} selected`
              : 'Select users to forward'
            }
          </span>
          <div className="flex items-center" style={{ gap: '8px' }}>
            <button
              onClick={onClose}
              className="hover:bg-gray-100 transition-colors"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: '#6B7280',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleForward}
              disabled={selectedUserIds.length === 0 || isLoading}
              className="transition-colors"
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                color: 'white',
                backgroundColor: selectedUserIds.length === 0 || isLoading ? '#9CA3AF' : '#1E9A80',
                cursor: selectedUserIds.length === 0 || isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? 'Forwarding...' : 'Forward'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

