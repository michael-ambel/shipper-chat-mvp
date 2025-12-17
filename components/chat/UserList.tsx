'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { BotMessageSquare, PencilLine, Search, Filter, MessageCircle, Check, CheckCheck, X, Users, Plus, MoreHorizontal, Pencil, Trash2, LogOut, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import CreateGroupModal from './CreateGroupModal'
import ConfirmModal from '../ui/ConfirmModal'

interface User {
  id: string
  name: string
  email: string
  avatar: string | null
  isAI: boolean
  lastSeen: string | null
  unreadCount?: number
  lastMessage?: string | null
  lastMessageTime?: string | null
  lastMessageSenderId?: string | null
  lastMessageIsRead?: boolean
  lastMessageDeliveredAt?: string | null
}

interface Group {
  id: string
  name: string
  avatar?: string | null
  description?: string | null
  memberCount: number
  members: { id: string; name: string; avatar?: string | null }[]
  lastMessage?: string | null
  lastMessageAt?: string
  unreadCount?: number
  updatedAt: string
}

interface SearchResult {
  id: string
  content: string
  createdAt: string
  senderId: string
  senderName: string
  sessionId: string
  chatPartner: {
    id: string
    name: string
    avatar: string | null
    isAI: boolean
  } | null
}

interface UserListProps {
  onlineUsers: string[]
  onSelectUser: (userId: string, messageId?: string) => void
  onSelectGroup?: (groupId: string) => void
  selectedUserId: string | null
  selectedGroupId?: string | null
  currentUserId?: string | null
  refreshTrigger?: number
  socket?: any
}

export default function UserList({ onlineUsers, onSelectUser, onSelectGroup, selectedUserId, selectedGroupId, currentUserId, refreshTrigger, socket }: UserListProps) {
  const [users, setUsers] = useState<User[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<NodeJS.Timeout | null>(null)
  const [createGroupModalOpen, setCreateGroupModalOpen] = useState(false)
  const [isCreatingGroup, setIsCreatingGroup] = useState(false)
  const [activeTab, setActiveTab] = useState<'chats' | 'groups'>('chats')
  const [showNewMessageDropdown, setShowNewMessageDropdown] = useState(false)
  const [dropdownSearchQuery, setDropdownSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [groupMenuOpen, setGroupMenuOpen] = useState<string | null>(null)
  const [editGroupModalOpen, setEditGroupModalOpen] = useState(false)
  const [deleteGroupModalOpen, setDeleteGroupModalOpen] = useState(false)
  const [selectedGroupForAction, setSelectedGroupForAction] = useState<Group | null>(null)
  const [editGroupName, setEditGroupName] = useState('')
  const [editGroupDescription, setEditGroupDescription] = useState('')
  const [isUpdatingGroup, setIsUpdatingGroup] = useState(false)
  const [isDeletingGroup, setIsDeletingGroup] = useState(false)
  const groupMenuRef = useRef<HTMLDivElement>(null)
  const [addMemberModalOpen, setAddMemberModalOpen] = useState(false)
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('')
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([])
  const [isAddingMembers, setIsAddingMembers] = useState(false)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNewMessageDropdown(false)
      }
      if (groupMenuRef.current && !groupMenuRef.current.contains(event.target as Node)) {
        setGroupMenuOpen(null)
      }
    }

    if (showNewMessageDropdown || groupMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showNewMessageDropdown, groupMenuOpen])

  const fetchUsers = async () => {
    try {
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

  const fetchGroups = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups?t=${Date.now()}`)
      const data = await response.json()
      if (response.ok) {
        setGroups(data.groups)
      }
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }, [])

  useEffect(() => {
    fetchUsers()
    fetchGroups()
  }, [fetchGroups])

  useEffect(() => {
    if (refreshTrigger) {
      fetchUsers()
      fetchGroups()
    }
  }, [refreshTrigger, fetchGroups])

  // Listen for group events
  useEffect(() => {
    if (!socket) {
      return
    }

    const handleGroupCreated = (data: any) => {
      fetchGroups()
    }

    const handleAddedToGroup = (data: any) => {
      fetchGroups()
    }

    const handleGroupMemberAdded = (data: any) => {
      fetchGroups()
    }

    const handleMemberRemoved = (data: any) => {
      fetchGroups()
    }

    socket.on('group_created', handleGroupCreated)
    socket.on('added_to_group', handleAddedToGroup)
    socket.on('group_member_added', handleGroupMemberAdded)
    socket.on('group_member_removed', handleMemberRemoved)

    return () => {
      socket.off('group_created', handleGroupCreated)
      socket.off('added_to_group', handleAddedToGroup)
      socket.off('group_member_added', handleGroupMemberAdded)
      socket.off('group_member_removed', handleMemberRemoved)
    }
  }, [socket, fetchGroups])

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)

    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }

    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/messages/search?q=${encodeURIComponent(query.trim())}`)
        const data = await response.json()
        if (response.ok) {
          setSearchResults(data.results)
        }
      } catch (error) {
        setSearchResults([])
      } finally {
        setIsSearching(false)
      }
    }, 300)

    setSearchDebounceTimer(timer)
  }, [searchDebounceTimer])

  const clearSearch = () => {
    setSearchQuery('')
    setSearchResults([])
    setIsSearching(false)
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
  }

  const handleSearchResultClick = (result: SearchResult) => {
    if (result.chatPartner) {
      onSelectUser(result.chatPartner.id, result.id)
      clearSearch()
    }
  }

  const handleCreateGroup = async (name: string, memberIds: string[], description?: string) => {
    setIsCreatingGroup(true)
    try {
      const response = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, memberIds, description }),
      })
      
      if (response.ok) {
        const data = await response.json()
        toast.success('Group created successfully!')
        setCreateGroupModalOpen(false)
        fetchGroups()
        
        // Get all member IDs from the response (includes creator)
        const allMemberIds = data.group.participants?.map((p: any) => p.user?.id || p.userId).filter(Boolean) || []
        
        // Notify all members about the new group via socket
        if (socket) {
          socket.emit('group_created', {
            group: data.group,
            memberIds: allMemberIds,
          })
        }
        
        if (onSelectGroup) {
          onSelectGroup(data.group.id)
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to create group')
      }
    } catch (error) {
      toast.error('Failed to create group')
    } finally {
      setIsCreatingGroup(false)
    }
  }

  const handleOpenEditGroup = (group: Group) => {
    setSelectedGroupForAction(group)
    setEditGroupName(group.name)
    setEditGroupDescription(group.description || '')
    setEditGroupModalOpen(true)
    setGroupMenuOpen(null)
  }

  const handleUpdateGroup = async () => {
    if (!selectedGroupForAction || !editGroupName.trim()) return
    
    setIsUpdatingGroup(true)
    try {
      const response = await fetch(`/api/groups/${selectedGroupForAction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editGroupName.trim(),
          description: editGroupDescription.trim() || null,
        }),
      })

      if (response.ok) {
        toast.success('Group updated successfully!')
        setEditGroupModalOpen(false)
        setSelectedGroupForAction(null)
        fetchGroups()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to update group')
      }
    } catch (error) {
      toast.error('Failed to update group')
    } finally {
      setIsUpdatingGroup(false)
    }
  }

  const handleOpenDeleteGroup = (group: Group) => {
    setSelectedGroupForAction(group)
    setDeleteGroupModalOpen(true)
    setGroupMenuOpen(null)
  }

  const handleDeleteGroup = async () => {
    if (!selectedGroupForAction) return
    
    setIsDeletingGroup(true)
    try {
      const response = await fetch(`/api/groups/${selectedGroupForAction.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Group deleted successfully!')
        setDeleteGroupModalOpen(false)
        setSelectedGroupForAction(null)
        fetchGroups()
        
        // If this group was selected, deselect it
        if (selectedGroupId === selectedGroupForAction.id && onSelectGroup) {
          onSelectGroup('')
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to delete group')
      }
    } catch (error) {
      toast.error('Failed to delete group')
    } finally {
      setIsDeletingGroup(false)
    }
  }

  const handleLeaveGroup = async (group: Group) => {
    setGroupMenuOpen(null)
    try {
      const response = await fetch(`/api/groups/${group.id}/leave`, {
        method: 'POST',
      })

      if (response.ok) {
        toast.success('Left group successfully!')
        
        // Notify other group members via socket
        if (socket && currentUserId) {
          socket.emit('group_member_removed', {
            sessionId: group.id,
            memberId: currentUserId,
          })
          // Leave the socket room
          socket.emit('leave_group', { sessionId: group.id })
        }
        
        fetchGroups()
        
        if (selectedGroupId === group.id && onSelectGroup) {
          onSelectGroup('')
        }
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to leave group')
      }
    } catch (error) {
      toast.error('Failed to leave group')
    }
  }

  const handleOpenAddMember = (group: Group) => {
    setSelectedGroupForAction(group)
    setAddMemberSearchQuery('')
    setSelectedUsersToAdd([])
    setAddMemberModalOpen(true)
    setGroupMenuOpen(null)
  }

  const handleAddMembers = async () => {
    if (!selectedGroupForAction || selectedUsersToAdd.length === 0) return
    
    setIsAddingMembers(true)
    try {
      const response = await fetch(`/api/groups/${selectedGroupForAction.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberIds: selectedUsersToAdd }),
      })

      if (response.ok) {
        toast.success('Members added successfully!')
        
        // Notify added members via socket
        if (socket) {
          for (const memberId of selectedUsersToAdd) {
            socket.emit('group_member_added', {
              sessionId: selectedGroupForAction.id,
              memberId,
              member: { id: memberId },
            })
          }
        }
        
        setAddMemberModalOpen(false)
        setSelectedGroupForAction(null)
        setSelectedUsersToAdd([])
        fetchGroups()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to add members')
      }
    } catch (error) {
      toast.error('Failed to add members')
    } finally {
      setIsAddingMembers(false)
    }
  }

  const getAvailableUsersToAdd = () => {
    if (!selectedGroupForAction) return []
    const existingMemberIds = selectedGroupForAction.members.map(m => m.id)
    return users.filter(u => 
      !existingMemberIds.includes(u.id) && 
      u.id !== currentUserId &&
      !u.isAI &&
      (addMemberSearchQuery === '' || 
       u.name.toLowerCase().includes(addMemberSearchQuery.toLowerCase()) ||
       u.email.toLowerCase().includes(addMemberSearchQuery.toLowerCase()))
    )
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

  const highlightMatch = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    
    return parts.map((part, i) => 
      regex.test(part) ? (
        <span key={i} style={{ backgroundColor: '#FEF08A', fontWeight: 500 }}>{part}</span>
      ) : (
        part
      )
    )
  }

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center" 
        style={{ 
          width: '400px', 
          height: '100%', 
          backgroundColor: '#FFFFFF', 
          borderRadius: '24px',
          padding: '24px',
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-2 mx-auto mb-3" style={{ borderColor: '#E8E5DF', borderTopColor: '#1E9A80' }}></div>
          <p style={{ fontSize: '12px', fontWeight: 400, color: '#8B8B8B', lineHeight: '16px' }}>Loading users...</p>
        </div>
      </div>
    )
  }

  const aiUsersCount = users.filter(u => u.isAI).length
  const otherOnlineCount = onlineUsers.filter(id => id !== currentUserId).length + aiUsersCount

  return (
    <div 
      className="flex flex-col overflow-hidden" 
      style={{ 
        width: '400px',
        height: '100%',
        backgroundColor: '#FFFFFF', 
        borderRadius: '24px',
        padding: '24px',
        gap: '24px',
      }}
    >
      {/* Header Row - Title and Action Buttons */}
      <div className="flex items-center justify-between">
        <h2 style={{ fontWeight: 600, color: '#09090B', fontSize: '20px', lineHeight: '30px', letterSpacing: '0%' }}>All Message</h2>
        <div className="relative" ref={dropdownRef}>
        <button
          className="flex items-center justify-center transition-colors hover:opacity-90"
          style={{
            height: '32px',
            padding: '8px 12px',
            backgroundColor: '#1E9A80',
            borderRadius: '8px',
            border: '1px solid #1E9A80',
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 500,
            gap: '6px',
            whiteSpace: 'nowrap',
          }}
            onClick={() => {
              setShowNewMessageDropdown(!showNewMessageDropdown)
              setDropdownSearchQuery('')
            }}
        >
          <PencilLine size={14} color="#FFFFFF" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '14px', fontWeight: 500, lineHeight: '20px', letterSpacing: '-0.6%', textAlign: 'center' }}>New Message</span>
          </button>

          {/* New Message Dropdown */}
          {showNewMessageDropdown && (
            <div
              className="absolute z-50"
              style={{
                top: '100%',
                right: 0,
                marginTop: '8px',
                width: '273px',
                height: '440px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                padding: '12px',
                border: '1px solid #E8E5DF',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
                display: 'flex',
                flexDirection: 'column',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Dropdown Header */}
              <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#111625' }}>
                  New Message
                </span>
                <button
                  onClick={() => setShowNewMessageDropdown(false)}
                  className="hover:bg-gray-100 transition-colors"
                  style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={14} color="#6B7280" />
                </button>
              </div>

              {/* Dropdown Search */}
              <div className="relative" style={{ marginBottom: '12px' }}>
                <Search size={14} color="#9CA3AF" className="absolute left-3 top-1/2 transform -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={activeTab === 'chats' ? 'Search name or email' : 'Search groups'}
                  value={dropdownSearchQuery}
                  onChange={(e) => setDropdownSearchQuery(e.target.value)}
                  className="w-full outline-none"
                  style={{
                    height: '36px',
                    border: '1px solid #E8E5DF',
                    borderRadius: '8px',
                    paddingLeft: '32px',
                    paddingRight: '12px',
                    fontSize: '13px',
                    color: '#404040',
                  }}
                />
              </div>

              {/* Dropdown List */}
              <div className="flex-1 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activeTab === 'chats' ? (
                  // Users list for 1-1 chat
                  users
                    .filter(u => !u.isAI && u.id !== currentUserId)
                    .filter(u => 
                      dropdownSearchQuery === '' || 
                      u.name.toLowerCase().includes(dropdownSearchQuery.toLowerCase()) ||
                      u.email.toLowerCase().includes(dropdownSearchQuery.toLowerCase())
                    )
                    .map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          onSelectUser(user.id)
                          setShowNewMessageDropdown(false)
                        }}
                        className="flex items-center w-full transition-colors"
                        style={{ 
                          padding: '8px', 
                          borderRadius: '8px', 
                          gap: '10px',
                          backgroundColor: selectedUserId === user.id ? '#F3F3EE' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedUserId !== user.id) {
                            e.currentTarget.style.backgroundColor = '#F3F3EE'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedUserId !== user.id) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <div
                          className="rounded-full flex items-center justify-center font-medium"
                          style={{ width: '32px', height: '32px', backgroundColor: '#F7F9FB', color: '#111625', fontSize: '12px', flexShrink: 0 }}
                        >
                          {getInitials(user.name)}
                        </div>
                        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#111625', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8B8B8B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {user.email}
                          </div>
                        </div>
                      </button>
                    ))
                ) : (
                  // Groups list
                  groups
                    .filter(g => 
                      dropdownSearchQuery === '' || 
                      g.name.toLowerCase().includes(dropdownSearchQuery.toLowerCase())
                    )
                    .map((group) => (
                      <button
                        key={group.id}
                        onClick={() => {
                          onSelectGroup?.(group.id)
                          setShowNewMessageDropdown(false)
                        }}
                        className="flex items-center w-full transition-colors"
                        style={{ 
                          padding: '8px', 
                          borderRadius: '8px', 
                          gap: '10px',
                          backgroundColor: selectedGroupId === group.id ? '#F3F3EE' : 'transparent'
                        }}
                        onMouseEnter={(e) => {
                          if (selectedGroupId !== group.id) {
                            e.currentTarget.style.backgroundColor = '#F3F3EE'
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedGroupId !== group.id) {
                            e.currentTarget.style.backgroundColor = 'transparent'
                          }
                        }}
                      >
                        <div
                          className="rounded-full flex items-center justify-center"
                          style={{ width: '32px', height: '32px', backgroundColor: '#F0FDF4', flexShrink: 0 }}
                        >
                          <Users size={16} style={{ color: '#1E9A80' }} />
                        </div>
                        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#111625', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {group.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#8B8B8B' }}>
                            {group.memberCount} members
                          </div>
                        </div>
                      </button>
                    ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex" style={{ gap: '4px', backgroundColor: '#F3F3EE', borderRadius: '10px', padding: '4px' }}>
        <button
          onClick={() => {
            setActiveTab('chats')
            onSelectGroup?.('')
          }}
          className="flex-1 flex items-center justify-center transition-colors"
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            backgroundColor: activeTab === 'chats' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'chats' ? '#111625' : '#6B7280',
            boxShadow: activeTab === 'chats' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          <MessageCircle size={14} style={{ marginRight: '6px' }} />
          Chats
        </button>
        <button
          onClick={() => {
            setActiveTab('groups')
            onSelectUser('')
          }}
          className="flex-1 flex items-center justify-center transition-colors"
          style={{
            padding: '8px 16px',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 500,
            backgroundColor: activeTab === 'groups' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'groups' ? '#111625' : '#6B7280',
            boxShadow: activeTab === 'groups' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none',
          }}
        >
          <Users size={14} style={{ marginRight: '6px' }} />
          Groups {groups.length > 0 && `(${groups.length})`}
        </button>
      </div>

      {/* Search Row - Input and Filter Button */}
      <div className="flex items-center" style={{ gap: '8px' }}>
        <div className="flex-1 relative">
          <Search 
            size={16} 
            color="#8B8B8B" 
            className="absolute left-3 top-1/2 transform -translate-y-1/2"
          />
          <input
            type="text"
            placeholder="Search in message"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full outline-none"
            style={{
              height: '40px',
              border: '1px solid #E8E5DF',
              borderRadius: '10px',
              paddingLeft: '36px',
              paddingRight: searchQuery ? '36px' : '12px',
              color: '#404040',
              fontSize: '14px',
              fontWeight: 400,
            }}
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 hover:opacity-70"
            >
              <X size={16} color="#8B8B8B" />
            </button>
          )}
        </div>
        <button
          className="flex items-center justify-center transition-colors hover:opacity-80"
          style={{
            width: '40px',
            height: '40px',
            border: '1px solid #E8E5DF',
            borderRadius: '10px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <Filter size={18} color="#151515" />
        </button>
      </div>

      {/* Search Results or Users List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-start' }}>
        {/* Search Results */}
        {searchQuery.trim().length >= 2 ? (
          isSearching ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-2" style={{ borderColor: '#E8E5DF', borderTopColor: '#1E9A80' }}></div>
            </div>
          ) : searchResults.length === 0 ? (
            <div className="p-4 text-center" style={{ fontWeight: 400, color: '#8B8B8B', fontSize: '12px', lineHeight: '16px' }}>
              No messages found for "{searchQuery}"
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ fontSize: '12px', fontWeight: 500, color: '#8B8B8B', marginBottom: '8px' }}>
                {searchResults.length} result{searchResults.length !== 1 ? 's' : ''} found
              </div>
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSearchResultClick(result)}
                  className="w-full text-left transition-all hover:bg-gray-50"
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: '#F9FAFB',
                    border: '1px solid #E8E5DF',
                  }}
                >
                  {/* Chat Partner Name */}
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontSize: '12px', fontWeight: 500, color: '#111625' }}>
                      {result.chatPartner?.name || 'Unknown'}
                    </span>
                    <span style={{ fontSize: '10px', color: '#8B8B8B' }}>
                      {formatLastSeen(result.createdAt)}
                    </span>
                  </div>
                  {/* Message Preview */}
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#6B7280',
                      lineHeight: '16px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <span style={{ color: '#8B8B8B' }}>{result.senderName}: </span>
                    {highlightMatch(result.content, searchQuery)}
                  </p>
                </button>
              ))}
            </div>
          )
        ) : activeTab === 'groups' ? (
          groups.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center" style={{ padding: '40px 20px' }}>
              <Users size={48} style={{ color: '#D1D5DB', marginBottom: '12px' }} />
              <p style={{ fontSize: '14px', color: '#6B7280', marginBottom: '16px', textAlign: 'center' }}>
                No groups yet
              </p>
              <button
                onClick={() => setCreateGroupModalOpen(true)}
                className="flex items-center transition-colors hover:opacity-90"
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#1E9A80',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  fontSize: '14px',
                  fontWeight: 500,
                  gap: '6px',
                }}
              >
                <Plus size={16} />
                Create Group
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Add Group Button - Only show when there are groups */}
              {groups.length > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '4px' }}>
                  <button
                    onClick={() => setCreateGroupModalOpen(true)}
                    className="flex items-center justify-center transition-colors hover:opacity-90"
                    style={{
                      height: '32px',
                      padding: '8px 12px',
                      backgroundColor: '#1E9A80',
                      borderRadius: '10px',
                      border: '1px solid #1E9A80',
                      color: '#FFFFFF',
                      fontSize: '14px',
                      fontWeight: 500,
                      gap: '6px',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    <Plus size={14} color="#FFFFFF" style={{ flexShrink: 0 }} />
                    <span style={{ fontSize: '14px', fontWeight: 500, lineHeight: '20px', letterSpacing: '-0.6%', textAlign: 'center' }}>Group</span>
                  </button>
                </div>
              )}
              {groups.map((group) => (
                <div 
                  key={group.id}
                  className="relative flex items-center transition-colors"
                  style={{
                    width: '100%',
                    borderRadius: '12px',
                    backgroundColor: selectedGroupId === group.id ? '#F3F3EE' : 'transparent',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedGroupId !== group.id) {
                      e.currentTarget.style.backgroundColor = '#F3F3EE'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedGroupId !== group.id) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <button
                    onClick={() => onSelectGroup?.(group.id)}
                    className="w-full flex items-center transition-all"
                    style={{
                      width: '100%',
                      height: '64px',
                      padding: '12px',
                      paddingRight: '40px',
                      gap: '8px'
                    }}
                  >
                    {typeof group.unreadCount === 'number' && group.unreadCount > 0 && (
                      <div 
                        className="flex flex-col items-center justify-center"
                        style={{ 
                          width: '64px', 
                          height: '64px', 
                          borderRadius: '12px',
                          padding: '12px',
                          gap: '8px',
                          flexShrink: 0,
                          backgroundColor: '#1E9A80',
                        }} 
                      >
                        <MessageCircle size={18} color="#FFFFFF" />
                        <span style={{ 
                          fontWeight: 500, 
                          fontSize: '12px', 
                          lineHeight: '16px', 
                          color: '#FFFFFF',
                        }}>
                          Unread
                        </span>
                      </div>
                    )}

                    <div className="flex items-center" style={{ flex: 1, gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                      <div 
                        className="rounded-full flex items-center justify-center"
                        style={{ 
                          width: '40px', 
                          height: '40px', 
                          backgroundColor: '#F0FDF4',
                          flexShrink: 0,
                        }}
                      >
                        <Users size={20} style={{ color: '#1E9A80' }} />
                      </div>

                      <div 
                        className="text-left flex flex-col justify-center" 
                        style={{ 
                          height: '40px', 
                          gap: '4px', 
                          flex: 1, 
                          minWidth: 0, 
                          overflow: 'hidden' 
                        }}
                      >
                        <div className="flex items-center justify-between" style={{ gap: '8px' }}>
                          <span 
                            style={{ 
                              fontWeight: 500, 
                              color: '#1C1C1C', 
                              fontSize: '14px', 
                              lineHeight: '20px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              flex: 1,
                              minWidth: 0,
                            }}
                          >
                            {group.name}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 400, color: '#8B8B8B', lineHeight: '16px', flexShrink: 0 }}>
                            {group.memberCount} members
                          </span>
                        </div>
                        <div className="flex items-center" style={{ gap: '6px' }}>
                          <span 
                            style={{ 
                              fontSize: '12px', 
                              fontWeight: 400, 
                              color: '#8B8B8B', 
                              lineHeight: '16px',
                              flex: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              minWidth: 0,
                            }}
                          >
                            {group.lastMessage || 'No messages yet'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>

                  {/* Group Menu */}
                  <div className="absolute" style={{ right: '8px', top: '50%', transform: 'translateY(-50%)' }} ref={groupMenuOpen === group.id ? groupMenuRef : null}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setGroupMenuOpen(groupMenuOpen === group.id ? null : group.id)
                      }}
                      className="hover:bg-gray-200 rounded-full transition-colors"
                      style={{ padding: '4px' }}
                    >
                      <MoreHorizontal size={16} style={{ color: '#8B8B8B' }} />
                    </button>

                    {groupMenuOpen === group.id && (
                      <div 
                        className="absolute z-50 bg-white rounded-lg shadow-lg"
                        style={{
                          right: 0,
                          top: '100%',
                          marginTop: '4px',
                          width: '150px',
                          border: '1px solid #E5E5E5',
                          overflow: 'hidden',
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenEditGroup(group)
                          }}
                          className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
                          style={{ padding: '10px 12px', fontSize: '13px', color: '#1C1C1C' }}
                        >
                          <Pencil size={14} />
                          Edit Group
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenAddMember(group)
                          }}
                          className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
                          style={{ padding: '10px 12px', fontSize: '13px', color: '#1C1C1C' }}
                        >
                          <UserPlus size={14} />
                          Add User
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLeaveGroup(group)
                          }}
                          className="w-full flex items-center gap-2 hover:bg-gray-50 transition-colors"
                          style={{ padding: '10px 12px', fontSize: '13px', color: '#8B8B8B' }}
                        >
                          <LogOut size={14} />
                          Leave Group
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleOpenDeleteGroup(group)
                          }}
                          className="w-full flex items-center gap-2 hover:bg-red-50 transition-colors"
                          style={{ padding: '10px 12px', fontSize: '13px', color: '#EF4444' }}
                        >
                          <Trash2 size={14} />
                          Delete Group
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        ) : users.length === 0 ? (
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
                  width: '100%',
                  height: '64px',
                  padding: '12px',
                  borderRadius: '12px',
                  backgroundColor: selectedUserId === user.id ? '#F3F3EE' : 'transparent',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  if (selectedUserId !== user.id) {
                    e.currentTarget.style.backgroundColor = '#F3F3EE'
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedUserId !== user.id) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                {/* Unread Indicator - Left Side (separate) */}
                {typeof user.unreadCount === 'number' && user.unreadCount > 0 && (
                  <div 
                    className="flex flex-col items-center justify-center"
                    style={{ 
                      width: '64px', 
                      height: '64px', 
                      borderRadius: '12px',
                      padding: '12px',
                      gap: '8px',
                      flexShrink: 0,
                      backgroundColor: '#1E9A80',
                    }} 
                  >
                    <MessageCircle size={18} color="#FFFFFF" />
                    <span style={{ 
                      fontWeight: 500, 
                      fontSize: '12px', 
                      lineHeight: '16px', 
                      letterSpacing: '0px',
                      color: '#FFFFFF',
                    }}>
                      Unread
                    </span>
                  </div>
                )}

                {/* User Content Wrapper */}
                <div className="flex items-center" style={{ flex: 1, gap: '8px', minWidth: 0, overflow: 'hidden' }}>
                  {/* User Icon */}
                  <div className="relative" style={{ width: '40px', height: '40px', flexShrink: 0 }}>
                    {user.isAI ? (
                      <>
                        <div className="rounded-full flex items-center justify-center" style={{ width: '40px', height: '40px', border: '2px solid #1E9A80', backgroundColor: 'transparent' }}>
                          <BotMessageSquare className="w-6 h-6" style={{ color: '#1E9A80' }} />
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

                  {/* User Details */}
                  <div 
                    className="text-left flex flex-col justify-center" 
                    style={{ 
                      height: '40px', 
                      gap: '4px', 
                      flex: 1, 
                      minWidth: 0, 
                      overflow: 'hidden' 
                    }}
                  >
                  {/* Row 1: Name and Time */}
                  <div className="flex items-center justify-between" style={{ gap: '8px' }}>
                    <span 
                      style={{ 
                        fontWeight: 500, 
                        color: '#1C1C1C', 
                        fontSize: '14px', 
                        lineHeight: '20px',
                        letterSpacing: '-0.6%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {user.name}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 400, color: '#8B8B8B', lineHeight: '16px', flexShrink: 0 }}>
                      {user.isAI ? 'Online' : formatLastSeen(user.lastSeen)}
                    </span>
                  </div>
                  {/* Row 2: Last Message and Read Status */}
                  <div className="flex items-center" style={{ gap: '6px' }}>
                    <span 
                      style={{ 
                        fontSize: '12px', 
                        fontWeight: 400, 
                        color: '#8B8B8B', 
                        lineHeight: '16px',
                        letterSpacing: '0px',
                        flex: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        minWidth: 0,
                      }}
                    >
                      {user.lastMessage && user.lastMessage.trim() ? user.lastMessage : (isOnline(user.id, user.isAI) ? 'Online' : 'Start a conversation')}
                    </span>
                    {/* Read Status Indicator */}
                    {user.lastMessage && user.lastMessage.trim() && (
                      <div style={{ flexShrink: 0 }}>
                        {user.lastMessageSenderId === currentUserId ? (
                          // Sent by current user - show delivery/read status
                          user.lastMessageIsRead ? (
                            <CheckCheck size={12} color="#1E9A80" />
                          ) : user.lastMessageDeliveredAt ? (
                            <CheckCheck size={12} color="#1E9A80" />
                          ) : (
                            <Check size={12} color="#1E9A80" />
                          )
                        ) : (
                          // Received from other user - show single check
                          <Check size={12} color="#1E9A80" />
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <CreateGroupModal
        isOpen={createGroupModalOpen}
        onClose={() => setCreateGroupModalOpen(false)}
        onCreateGroup={handleCreateGroup}
        currentUserId={currentUserId || ''}
        isLoading={isCreatingGroup}
      />

      {/* Edit Group Modal */}
      {editGroupModalOpen && selectedGroupForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div 
            className="bg-white rounded-2xl shadow-xl"
            style={{ width: '340px', padding: '20px' }}
          >
            <div className="flex items-center justify-between" style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1C1C1C' }}>Edit Group</h3>
              <button
                onClick={() => {
                  setEditGroupModalOpen(false)
                  setSelectedGroupForAction(null)
                }}
                className="hover:bg-gray-100 rounded-full transition-colors"
                style={{ padding: '4px' }}
              >
                <X size={18} style={{ color: '#8B8B8B' }} />
              </button>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1C1C1C', display: 'block', marginBottom: '6px' }}>
                Group Name
              </label>
              <input
                type="text"
                value={editGroupName}
                onChange={(e) => setEditGroupName(e.target.value)}
                placeholder="Enter group name"
                className="w-full outline-none"
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E5E5',
                  fontSize: '14px',
                }}
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: '#1C1C1C', display: 'block', marginBottom: '6px' }}>
                Description (optional)
              </label>
              <textarea
                value={editGroupDescription}
                onChange={(e) => setEditGroupDescription(e.target.value)}
                placeholder="Enter group description"
                className="w-full outline-none resize-none"
                rows={3}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #E5E5E5',
                  fontSize: '14px',
                }}
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditGroupModalOpen(false)
                  setSelectedGroupForAction(null)
                }}
                className="flex-1 transition-colors hover:bg-gray-100"
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: '1px solid #E5E5E5',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#1C1C1C',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateGroup}
                disabled={!editGroupName.trim() || isUpdatingGroup}
                className="flex-1 transition-colors disabled:opacity-50"
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#1E9A80',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                }}
              >
                {isUpdatingGroup ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirm Modal */}
      <ConfirmModal
        isOpen={deleteGroupModalOpen}
        onCancel={() => {
          setDeleteGroupModalOpen(false)
          setSelectedGroupForAction(null)
        }}
        onConfirm={handleDeleteGroup}
        title="Delete Group"
        message={`Are you sure you want to delete "${selectedGroupForAction?.name}"? This action cannot be undone.`}
        confirmText={isDeletingGroup ? 'Deleting...' : 'Delete'}
        variant="danger"
      />

      {/* Add Member Modal */}
      {addMemberModalOpen && selectedGroupForAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div 
            className="bg-white rounded-2xl shadow-xl"
            style={{ width: '340px', maxHeight: '480px', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ padding: '20px', paddingBottom: '12px' }}>
              <div className="flex items-center justify-between" style={{ marginBottom: '12px' }}>
                <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1C1C1C' }}>Add Members</h3>
                <button
                  onClick={() => {
                    setAddMemberModalOpen(false)
                    setSelectedGroupForAction(null)
                    setSelectedUsersToAdd([])
                  }}
                  className="hover:bg-gray-100 rounded-full transition-colors"
                  style={{ padding: '4px' }}
                >
                  <X size={18} style={{ color: '#8B8B8B' }} />
                </button>
              </div>

              <div className="relative">
                <Search 
                  size={16} 
                  className="absolute left-3 top-1/2 transform -translate-y-1/2"
                  style={{ color: '#8B8B8B' }}
                />
                <input
                  type="text"
                  value={addMemberSearchQuery}
                  onChange={(e) => setAddMemberSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="w-full outline-none"
                  style={{
                    padding: '10px 12px 10px 36px',
                    borderRadius: '8px',
                    border: '1px solid #E5E5E5',
                    fontSize: '14px',
                  }}
                />
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
              {getAvailableUsersToAdd().length === 0 ? (
                <div style={{ padding: '20px 0', textAlign: 'center', color: '#8B8B8B', fontSize: '14px' }}>
                  No users available to add
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {getAvailableUsersToAdd().map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        setSelectedUsersToAdd(prev => 
                          prev.includes(user.id) 
                            ? prev.filter(id => id !== user.id)
                            : [...prev, user.id]
                        )
                      }}
                      className="w-full flex items-center gap-3 hover:bg-gray-50 transition-colors rounded-lg"
                      style={{ padding: '10px 8px' }}
                    >
                      <div 
                        className="rounded-full flex items-center justify-center"
                        style={{ 
                          width: '36px', 
                          height: '36px', 
                          backgroundColor: '#F0FDF4',
                          flexShrink: 0,
                        }}
                      >
                        {user.avatar ? (
                          <img src={user.avatar} alt={user.name} className="w-full h-full rounded-full object-cover" />
                        ) : (
                          <span style={{ fontSize: '13px', fontWeight: 500, color: '#1E9A80' }}>
                            {getInitials(user.name)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 text-left" style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '14px', fontWeight: 500, color: '#1C1C1C' }}>{user.name}</div>
                        <div style={{ fontSize: '12px', color: '#8B8B8B', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.email}</div>
                      </div>
                      <div 
                        className="rounded-md flex items-center justify-center"
                        style={{ 
                          width: '20px', 
                          height: '20px', 
                          border: selectedUsersToAdd.includes(user.id) ? 'none' : '2px solid #E5E5E5',
                          backgroundColor: selectedUsersToAdd.includes(user.id) ? '#1E9A80' : 'transparent',
                          flexShrink: 0,
                        }}
                      >
                        {selectedUsersToAdd.includes(user.id) && (
                          <Check size={14} color="#FFFFFF" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: '12px 20px 20px' }}>
              <button
                onClick={handleAddMembers}
                disabled={selectedUsersToAdd.length === 0 || isAddingMembers}
                className="w-full transition-colors disabled:opacity-50"
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  backgroundColor: '#1E9A80',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                }}
              >
                {isAddingMembers ? 'Adding...' : `Add ${selectedUsersToAdd.length > 0 ? `(${selectedUsersToAdd.length})` : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}



