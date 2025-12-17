'use client'

import { useState, useEffect } from 'react'
import { X, Search, Users, Check } from 'lucide-react'

interface User {
  id: string
  name: string
  email: string
  avatar?: string
  isAI: boolean
}

interface CreateGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateGroup: (name: string, memberIds: string[], description?: string) => Promise<void>
  currentUserId: string
  isLoading?: boolean
}

export default function CreateGroupModal({
  isOpen,
  onClose,
  onCreateGroup,
  currentUserId,
  isLoading = false,
}: CreateGroupModalProps) {
  const [users, setUsers] = useState<User[]>([])
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [groupName, setGroupName] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState<'select' | 'details'>('select')

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
      setSelectedUserIds([])
      setSearchQuery('')
      setGroupName('')
      setDescription('')
      setStep('select')
    }
  }, [isOpen])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(data.users.filter((u: User) => u.id !== currentUserId && !u.isAI))
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleUser = (userId: string) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )
  }

  const handleNext = () => {
    if (selectedUserIds.length > 0) {
      setStep('details')
    }
  }

  const handleBack = () => {
    setStep('select')
  }

  const handleCreate = async () => {
    if (groupName.trim() && selectedUserIds.length > 0) {
      await onCreateGroup(groupName.trim(), selectedUserIds, description.trim() || undefined)
    }
  }

  const filteredUsers = users.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 flex items-center justify-center z-50"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl"
        style={{
          width: '440px',
          maxHeight: '560px',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
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
            <Users size={18} style={{ color: '#1E9A80' }} />
            <span style={{ fontSize: '16px', fontWeight: 600, color: '#111625' }}>
              {step === 'select' ? 'New Group' : 'Group Details'}
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

        {step === 'select' ? (
          <>
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

            {/* Selected Users Pills */}
            {selectedUserIds.length > 0 && (
              <div
                className="flex flex-wrap"
                style={{ padding: '0 20px 12px', gap: '8px' }}
              >
                {selectedUserIds.map((id) => {
                  const user = users.find((u) => u.id === id)
                  return user ? (
                    <div
                      key={id}
                      className="flex items-center"
                      style={{
                        backgroundColor: '#F0FDF4',
                        borderRadius: '16px',
                        padding: '4px 8px 4px 12px',
                        gap: '4px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: '#1E9A80' }}>
                        {user.name}
                      </span>
                      <button
                        onClick={() => toggleUser(id)}
                        className="flex items-center justify-center hover:bg-green-200 transition-colors"
                        style={{ width: '18px', height: '18px', borderRadius: '50%' }}
                      >
                        <X size={12} style={{ color: '#1E9A80' }} />
                      </button>
                    </div>
                  ) : null
                })}
              </div>
            )}

            {/* User List */}
            <div
              className="flex-1 overflow-y-auto"
              style={{
                padding: '0 20px',
                maxHeight: '280px',
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center" style={{ padding: '20px' }}>
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-[#1E9A80]" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div
                  style={{
                    padding: '20px',
                    textAlign: 'center',
                    color: '#6B7280',
                    fontSize: '14px',
                  }}
                >
                  No users found
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className="flex items-center w-full hover:bg-gray-50 transition-colors"
                      style={{
                        padding: '10px 12px',
                        borderRadius: '8px',
                        gap: '12px',
                        backgroundColor: selectedUserIds.includes(user.id)
                          ? '#F0FDF4'
                          : 'transparent',
                      }}
                    >
                      {/* Avatar */}
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
                          border: selectedUserIds.includes(user.id)
                            ? 'none'
                            : '2px solid #D1D5DB',
                          backgroundColor: selectedUserIds.includes(user.id)
                            ? '#1E9A80'
                            : 'transparent',
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
                {selectedUserIds.length} selected
              </span>
              <button
                onClick={handleNext}
                disabled={selectedUserIds.length === 0}
                className="transition-colors"
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: selectedUserIds.length === 0 ? '#9CA3AF' : '#1E9A80',
                  cursor: selectedUserIds.length === 0 ? 'not-allowed' : 'pointer',
                }}
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Group Details Form */}
            <div style={{ padding: '20px', flex: 1 }}>
              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Group Name *
                </label>
                <input
                  type="text"
                  placeholder="Enter group name"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  className="w-full focus:outline-none focus:ring-2 focus:ring-green-500"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Description (optional)
                </label>
                <textarea
                  placeholder="What's this group about?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #E5E7EB',
                    fontSize: '14px',
                    height: '80px',
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '6px',
                  }}
                >
                  Members ({selectedUserIds.length + 1})
                </label>
                <div
                  className="flex flex-wrap"
                  style={{ gap: '6px' }}
                >
                  <div
                    style={{
                      backgroundColor: '#1E9A80',
                      borderRadius: '16px',
                      padding: '4px 12px',
                      fontSize: '13px',
                      color: 'white',
                    }}
                  >
                    You (Admin)
                  </div>
                  {selectedUserIds.map((id) => {
                    const user = users.find((u) => u.id === id)
                    return user ? (
                      <div
                        key={id}
                        style={{
                          backgroundColor: '#F7F9FB',
                          borderRadius: '16px',
                          padding: '4px 12px',
                          fontSize: '13px',
                          color: '#374151',
                        }}
                      >
                        {user.name}
                      </div>
                    ) : null
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-between"
              style={{
                padding: '16px 20px',
                borderTop: '1px solid #E5E7EB',
              }}
            >
              <button
                onClick={handleBack}
                className="hover:bg-gray-100 transition-colors"
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#6B7280',
                }}
              >
                Back
              </button>
              <button
                onClick={handleCreate}
                disabled={!groupName.trim() || isLoading}
                className="transition-colors"
                style={{
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: 'white',
                  backgroundColor: !groupName.trim() || isLoading ? '#9CA3AF' : '#1E9A80',
                  cursor: !groupName.trim() || isLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {isLoading ? 'Creating...' : 'Create Group'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

