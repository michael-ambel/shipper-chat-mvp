'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { ChevronLeft, MessageCircleMore, Send, Search, Phone, Video, MoreVertical, BotMessageSquare, X, Check } from 'lucide-react'
import { MessageStatus } from './MessageStatus'
import MessageActions from './MessageActions'
import MessageReactions from './MessageReactions'
import ConfirmModal from '../ui/ConfirmModal'

interface Reaction {
  id: string
  emoji: string
  userId: string
  user: {
    id: string
    name: string
  }
}

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
  deliveredAt?: string | null
  isRead?: boolean | null
  readAt?: string | null
  isEdited?: boolean
  editedAt?: string | null
  isDeleted?: boolean
  reactions?: Reaction[]
  sender: {
    id: string
    name: string
    email: string
    avatar: string | null
  }
}

interface ChatWindowProps {
  selectedUserId: string | null
  selectedUserName: string | null
  currentUserId: string | null
  socket: Socket | null
  onBack: () => void
  isMobile: boolean
  onUnreadChange?: () => void
  isAI?: boolean
  onlineUsers?: string[]
}

export default function ChatWindow({ selectedUserId, selectedUserName, currentUserId, socket, onBack, isMobile, onUnreadChange, isAI, onlineUsers = [] }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [aiStreaming, setAiStreaming] = useState(false)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [messageToDelete, setMessageToDelete] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedUserId) {
      loadSession()
    } else {
      setMessages([])
      setSessionId(null)
    }

    // Cleanup typing timeouts when switching users
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTypingTimeoutRef.current) {
        clearTimeout(isTypingTimeoutRef.current)
      }
      setIsTyping(false)
    }
  }, [selectedUserId])

  // Global socket listeners for message status updates
  useEffect(() => {
    if (!socket) return

    const handleMessageDelivered = (data: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, deliveredAt: data.deliveredAt }
            : m
        )
      )
    }

    const handleMessageRead = (data: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, isRead: true, readAt: data.readAt }
            : m
        )
      )
    }

    const handleMessageEdited = (data: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, content: data.content, isEdited: true, editedAt: data.editedAt }
            : m
        )
      )
    }

    const handleMessageDeleted = (data: any) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId
            ? { ...m, isDeleted: true, content: '' }
            : m
        )
      )
    }

    const handleReactionAdded = (data: any) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.messageId) return m
          const newReaction: Reaction = {
            id: data.reaction?.id || Date.now().toString(),
            emoji: data.emoji,
            userId: data.userId,
            user: data.reaction?.user || { id: data.userId, name: 'User' },
          }
          
          // For 1-1 chats (replaced=true): remove any existing reaction from this user first
          let existingReactions = m.reactions || []
          if (data.replaced) {
            existingReactions = existingReactions.filter(
              (r) => r.userId !== data.userId
            )
          }
          
          const alreadyExists = existingReactions.some(
            (r) => r.userId === data.userId && r.emoji === data.emoji
          )
          if (alreadyExists) return m
          return { ...m, reactions: [...existingReactions, newReaction] }
        })
      )
    }

    const handleReactionRemoved = (data: any) => {
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== data.messageId) return m
          return {
            ...m,
            reactions: (m.reactions || []).filter(
              (r) => !(r.userId === data.userId && r.emoji === data.emoji)
            ),
          }
        })
      )
    }

    socket.on('message_delivered', handleMessageDelivered)
    socket.on('message_read', handleMessageRead)
    socket.on('message_edited', handleMessageEdited)
    socket.on('message_deleted', handleMessageDeleted)
    socket.on('reaction_added', handleReactionAdded)
    socket.on('reaction_removed', handleReactionRemoved)

    return () => {
      socket.off('message_delivered', handleMessageDelivered)
      socket.off('message_read', handleMessageRead)
      socket.off('message_edited', handleMessageEdited)
      socket.off('message_deleted', handleMessageDeleted)
      socket.off('reaction_added', handleReactionAdded)
      socket.off('reaction_removed', handleReactionRemoved)
    }
  }, [socket])

  // Session-specific socket listeners
  useEffect(() => {
    if (socket && sessionId) {
      const handleReceiveMessage = (data: any) => {
        if (data.senderId === selectedUserId) {
          const newMessage: Message = {
            id: data.messageId || Date.now().toString(),
            content: data.message,
            senderId: data.senderId,
            createdAt: data.timestamp,
            deliveredAt: data.timestamp,
            isRead: false,
            readAt: null,
            sender: {
              id: data.senderId,
              name: selectedUserName || 'User',
              email: '',
              avatar: null,
            },
          }
          setMessages((prev) => [...prev, newMessage])
          scrollToBottom()

          // Mark as read immediately since chat is open
          if (data.messageId) {
            markMessageAsRead(data.messageId)
          }
        }
      }

      socket.on('receive_message', handleReceiveMessage)

      const handleUserTyping = (data: any) => {
        if (data.userId === selectedUserId) {
          setIsTyping(true)
          
          // Auto-clear typing indicator after 3 seconds
          if (isTypingTimeoutRef.current) {
            clearTimeout(isTypingTimeoutRef.current)
          }
          isTypingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
          }, 3000)
        }
      }

      const handleUserStopTyping = (data: any) => {
        if (data.userId === selectedUserId) {
          setIsTyping(false)
          if (isTypingTimeoutRef.current) {
            clearTimeout(isTypingTimeoutRef.current)
          }
        }
      }

      socket.on('user_typing', handleUserTyping)
      socket.on('user_stop_typing', handleUserStopTyping)

      return () => {
        socket.off('receive_message', handleReceiveMessage)
        socket.off('user_typing', handleUserTyping)
        socket.off('user_stop_typing', handleUserStopTyping)
        if (isTypingTimeoutRef.current) {
          clearTimeout(isTypingTimeoutRef.current)
        }
      }
    }
  }, [socket, sessionId, selectedUserId, selectedUserName])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadSession = async () => {
    try {
      setLoading(true)
      const sessionResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientId: selectedUserId }),
      })

      const sessionData = await sessionResponse.json()
      if (sessionResponse.ok) {
        setSessionId(sessionData.session.id)

        const messagesResponse = await fetch(
          `/api/messages?sessionId=${sessionData.session.id}`
        )
        const messagesData = await messagesResponse.json()
        if (messagesResponse.ok) {
          setMessages(messagesData.messages)

          // Mark incoming messages as read
          const unread = messagesData.messages.filter(
            (m: Message) =>
              m.senderId !== currentUserId && !m.isRead
          )

          if (unread.length > 0) {
            // Mark all unread messages as read (skip individual refreshes)
            Promise.all(
              unread.map((m: Message) => markMessageAsRead(m.id, true))
            ).then(() => {
              // Refresh user list once after all messages are marked as read
              if (onUnreadChange) {
                setTimeout(onUnreadChange, 300)
              }
            })
          }
        }
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId) return

    const messageContent = inputValue.trim()
    setInputValue('')

    // Handle AI chat
    if (isAI) {
      try {
        // Add user message to UI
        const userMessage: Message = {
          id: Date.now().toString(),
          content: messageContent,
          senderId: currentUserId || '',
          createdAt: new Date().toISOString(),
          sender: {
            id: currentUserId || '',
            name: 'You',
            email: '',
            avatar: null,
          },
        }
        setMessages((prev) => [...prev, userMessage])
        setAiStreaming(true)

        // Stream AI response
        const response = await fetch('/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            message: messageContent,
          }),
        })

        if (!response.ok || !response.body) {
          setAiStreaming(false)
          return
        }

        // Create AI message placeholder
        const aiMessageId = `ai-${Date.now()}`
        const aiMessage: Message = {
          id: aiMessageId,
          content: '',
          senderId: selectedUserId || '',
          createdAt: new Date().toISOString(),
          sender: {
            id: selectedUserId || '',
            name: selectedUserName || 'AI',
            email: '',
            avatar: null,
          },
        }
        setMessages((prev) => [...prev, aiMessage])

        // Stream the response
        const reader = response.body.getReader()
        const decoder = new TextDecoder()

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = decoder.decode(value)
          setMessages((prev) =>
            prev.map((m) =>
              m.id === aiMessageId
                ? { ...m, content: m.content + chunk }
                : m
            )
          )
          scrollToBottom()
        }

        setAiStreaming(false)
      } catch (error) {
        setAiStreaming(false)
      }
      return
    }

    // Handle regular user chat
    if (!socket) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content: messageContent,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setMessages((prev) => [...prev, data.message])

        socket.emit('send_message', {
          recipientId: selectedUserId,
          message: messageContent,
          messageId: data.message.id,
        })
      }
    } catch (error) {
    }
  }

  const handleTyping = useCallback(() => {
    if (!socket || !selectedUserId) return

    // Emit typing event
    socket.emit('typing', { recipientId: selectedUserId })

    // Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    // Set timeout to emit stop_typing after 1500ms of inactivity
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('stop_typing', { recipientId: selectedUserId })
    }, 1500)
  }, [socket, selectedUserId])

  const markMessageAsRead = async (messageId: string, skipRefresh = false) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/status`, {
        method: 'PATCH',
      })
      
      if (!response.ok) {
        return
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, isRead: true, readAt: new Date().toISOString() } : m
        )
      )

      if (socket) {
        socket.emit('message_read', { messageId })
      }

      // Refresh unread counts after marking as read (unless batching)
      if (!skipRefresh && onUnreadChange) {
        setTimeout(() => onUnreadChange(), 200)
      }
    } catch (error) {
    }
  }

  const handleStartEdit = (message: Message) => {
    setEditingMessageId(message.id)
    setEditContent(message.content)
    setTimeout(() => editInputRef.current?.focus(), 0)
  }

  const handleCancelEdit = () => {
    setEditingMessageId(null)
    setEditContent('')
  }

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editContent.trim()) return

    try {
      const response = await fetch(`/api/messages/${editingMessageId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editContent.trim() }),
      })

      if (response.ok) {
        const data = await response.json()
        setMessages((prev) =>
          prev.map((m) =>
            m.id === editingMessageId
              ? { ...m, content: data.message.content, isEdited: true, editedAt: data.message.editedAt }
              : m
          )
        )

        // Broadcast to recipient
        if (socket && selectedUserId) {
          socket.emit('edit_message', {
            messageId: editingMessageId,
            content: data.message.content,
            recipientId: selectedUserId,
            sessionId,
          })
        }
      }
    } catch (error) {
    } finally {
      handleCancelEdit()
    }
  }

  const handleDeleteMessage = (messageId: string) => {
    setMessageToDelete(messageId)
    setDeleteModalOpen(true)
  }

  const confirmDeleteMessage = async () => {
    if (!messageToDelete) return

    try {
      const response = await fetch(`/api/messages/${messageToDelete}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageToDelete ? { ...m, isDeleted: true, content: '' } : m
          )
        )

        // Broadcast to recipient
        if (socket && selectedUserId) {
          socket.emit('delete_message', {
            messageId: messageToDelete,
            recipientId: selectedUserId,
            sessionId,
          })
        }
      }
    } catch (error) {
    } finally {
      setDeleteModalOpen(false)
      setMessageToDelete(null)
    }
  }

  const handleAddReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      })

      if (response.ok) {
        const data = await response.json()
        const newReaction: Reaction = {
          id: data.reaction.id,
          emoji: data.reaction.emoji,
          userId: data.reaction.userId,
          user: data.reaction.user,
        }

        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            
            // For 1-1 chats (replaced=true): remove any existing reaction from this user first
            let existingReactions = m.reactions || []
            if (data.replaced) {
              existingReactions = existingReactions.filter(
                (r) => r.userId !== currentUserId
              )
            }
            
            // Check if same emoji already exists (shouldn't happen but safety check)
            const alreadyExists = existingReactions.some(
              (r) => r.userId === currentUserId && r.emoji === emoji
            )
            if (alreadyExists) return m
            
            return { ...m, reactions: [...existingReactions, newReaction] }
          })
        )

        // Broadcast to recipient
        if (socket && selectedUserId) {
          socket.emit('add_reaction', {
            messageId,
            emoji,
            recipientId: selectedUserId,
            sessionId,
            reaction: newReaction,
            replaced: data.replaced,
          })
        }
      }
    } catch (error) {
    }
  }

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setMessages((prev) =>
          prev.map((m) => {
            if (m.id !== messageId) return m
            return {
              ...m,
              reactions: (m.reactions || []).filter(
                (r) => !(r.userId === currentUserId && r.emoji === emoji)
              ),
            }
          })
        )

        // Broadcast to recipient
        if (socket && selectedUserId) {
          socket.emit('remove_reaction', {
            messageId,
            emoji,
            recipientId: selectedUserId,
            sessionId,
          })
        }
      }
    } catch (error) {
    }
  }

  const handleToggleReaction = (messageId: string, emoji: string, hasReacted: boolean) => {
    if (hasReacted) {
      handleRemoveReaction(messageId, emoji)
    } else {
      handleAddReaction(messageId, emoji)
    }
  }

  const getGroupedReactions = (reactions: Reaction[] | undefined) => {
    if (!reactions || reactions.length === 0) return []

    const grouped: { [emoji: string]: { users: { id: string; name: string }[]; count: number } } = {}

    reactions.forEach((r) => {
      if (!grouped[r.emoji]) {
        grouped[r.emoji] = { users: [], count: 0 }
      }
      grouped[r.emoji].users.push(r.user)
      grouped[r.emoji].count++
    })

    return Object.entries(grouped).map(([emoji, data]) => ({
      emoji,
      count: data.count,
      users: data.users,
      hasReacted: data.users.some((u) => u.id === currentUserId),
    }))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    handleTyping()
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
      
      // Stop typing indicator when sending
      if (socket && selectedUserId) {
        socket.emit('stop_typing', { recipientId: selectedUserId })
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current)
        }
      }
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  if (!selectedUserId) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px' }}>
        <div className="text-center">
          <MessageCircleMore className="mx-auto mb-3" style={{ width: '32px', height: '32px', color: '#8B8B8B' }} />
          <h3 className="mb-1" style={{ fontSize: '14px', fontWeight: 500, color: '#09090B', lineHeight: '20px' }}>
            Select a conversation
          </h3>
          <p style={{ fontSize: '12px', fontWeight: 400, color: '#8B8B8B', lineHeight: '16px' }}>
            Choose a user from the list to start chatting
          </p>
        </div>
      </div>
    )
  }

  const isOnline = isAI || (selectedUserId && onlineUsers?.includes(selectedUserId))

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '12px' }}>
      {/* Header */}
      <div 
        className="flex items-center justify-between"
        style={{ 
          width: '100%',
          height: '60px',
          paddingTop: '4px',
          paddingRight: '12px',
          paddingBottom: '16px',
          paddingLeft: '12px',
          gap: '12px',
        }}
      >
        {/* Left - User Info */}
        <div className="flex items-center" style={{ gap: '12px' }}>
          {isMobile && (
            <button
              onClick={onBack}
              className="sm:hidden transition-colors flex items-center justify-center"
              style={{ 
                width: '24px', 
                height: '24px', 
                backgroundColor: '#F3F3EE', 
                borderRadius: '6px' 
              }}
              aria-label="Back to users"
            >
              <ChevronLeft style={{ width: '16px', height: '16px', color: '#28303F' }} />
            </button>
          )}
          {/* User Avatar */}
          {isAI ? (
            <div 
              className="rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center"
              style={{ 
                width: '40px', 
                height: '40px', 
                flexShrink: 0,
              }}
            >
              <BotMessageSquare className="w-5 h-5" />
            </div>
          ) : (
            <div 
              className="rounded-full flex items-center justify-center font-medium"
              style={{ 
                width: '40px', 
                height: '40px', 
                backgroundColor: '#F7F9FB', 
                color: '#111625',
                flexShrink: 0,
              }}
            >
              {selectedUserName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
            </div>
          )}
          {/* Name and Status */}
          <div className="flex flex-col" style={{ gap: '2px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 500, color: '#111625', lineHeight: '20px', letterSpacing: '-0.006em' }}>
              {selectedUserName}
            </h2>
            <span style={{ fontSize: '12px', fontWeight: 400, color: isOnline ? '#38C793' : '#8B8B8B', lineHeight: '16px' }}>
              {isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
        </div>

        {/* Right - Action Buttons */}
        <div className="flex items-center" style={{ height: '32px', gap: '12px' }}>
          <button
            className="flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #E8E5DF',
              backgroundColor: '#FFFFFF',
              gap: '4px',
            }}
          >
            <Search size={16} color="#262626" />
          </button>
          <button
            className="flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #E8E5DF',
              backgroundColor: '#FFFFFF',
              gap: '4px',
            }}
          >
            <Phone size={16} color="#262626" />
          </button>
          <button
            className="flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #E8E5DF',
              backgroundColor: '#FFFFFF',
              gap: '4px',
            }}
          >
            <Video size={16} color="#262626" />
          </button>
          <button
            className="flex items-center justify-center transition-opacity hover:opacity-70"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid #E8E5DF',
              backgroundColor: '#FFFFFF',
              gap: '4px',
            }}
          >
            <MoreVertical size={16} color="#262626" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide" style={{ backgroundColor: '#F3F3EE', borderRadius: '16px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-2 mx-auto mb-3" style={{ borderColor: '#E8E5DF', borderTopColor: '#1E9A80' }}></div>
              <p style={{ fontSize: '12px', fontWeight: 400, color: '#8B8B8B', lineHeight: '16px' }}>Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircleMore className="mx-auto mb-3" style={{ width: '32px', height: '32px', color: '#8B8B8B' }} />
              <p style={{ fontSize: '12px', fontWeight: 400, color: '#8B8B8B', lineHeight: '16px' }}>
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message, index) => {
              const isOwn = message.senderId === currentUserId
              const prevMessage = index > 0 ? messages[index - 1] : null
              const isConsecutive = prevMessage && prevMessage.senderId === message.senderId
              const isEditing = editingMessageId === message.id
              const groupedReactions = getGroupedReactions(message.reactions)
              
              return (
                <div
                  key={message.id}
                  className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                  style={{ marginBottom: isConsecutive ? '4px' : '12px' }}
                  onMouseEnter={() => setHoveredMessageId(message.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  <div className="relative">
                    {isEditing ? (
                      <div
                        className="flex items-center gap-2"
                        style={{ minWidth: '200px' }}
                      >
                        <input
                          ref={editInputRef}
                          type="text"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEdit()
                            if (e.key === 'Escape') handleCancelEdit()
                          }}
                          className="flex-1 px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-green-500"
                          style={{
                            fontSize: '12px',
                            borderColor: '#E8E5DF',
                            backgroundColor: '#FFFFFF',
                          }}
                        />
                        <button
                          onClick={handleSaveEdit}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-green-500 text-white hover:bg-green-600 transition-colors"
                        >
                          <Check size={14} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-200 hover:bg-gray-300 transition-colors"
                        >
                          <X size={14} color="#6B7280" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div
                          className="relative max-w-[75%] sm:max-w-xs lg:max-w-md"
                          style={{
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: message.isDeleted ? '#F3F4F6' : isOwn ? '#F0FDF4' : '#FFFFFF',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            opacity: message.isDeleted ? 0.7 : 1,
                            marginBottom: groupedReactions.length > 0 ? '8px' : 0,
                          }}
                        >
                          {message.isDeleted ? (
                            <p className="italic" style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: '16px' }}>
                              This message was deleted
                            </p>
                          ) : (
                            <p className="wrap-break-word" style={{ fontSize: '12px', color: '#111625', lineHeight: '16px' }}>
                              {message.content}
                            </p>
                          )}
                          {/* Reactions - positioned at bottom corner of message */}
                          {!message.isDeleted && groupedReactions.length > 0 && (
                            <MessageReactions
                              reactions={groupedReactions}
                              onToggleReaction={(emoji, hasReacted) =>
                                handleToggleReaction(message.id, emoji, hasReacted)
                              }
                              isOwn={isOwn}
                            />
                          )}
                        </div>
                        {!isAI && (
                          <MessageActions
                            isOwn={isOwn}
                            isDeleted={message.isDeleted || false}
                            onEdit={() => handleStartEdit(message)}
                            onDelete={() => handleDeleteMessage(message.id)}
                            onReact={(emoji) => handleAddReaction(message.id, emoji)}
                            show={hoveredMessageId === message.id}
                          />
                        )}
                      </>
                    )}
                  </div>
                  <div className="flex items-center" style={{ marginTop: '4px', gap: '6px' }}>
                    {isOwn && !message.isDeleted && (
                      <MessageStatus
                        isOwn={isOwn}
                        deliveredAt={message.deliveredAt}
                        isRead={message.isRead}
                      />
                    )}
                    <span style={{ fontSize: '12px', fontWeight: 400, lineHeight: '16px', color: '#8B8B8B' }}>
                      {formatTime(message.createdAt)}
                      {message.isEdited && !message.isDeleted && (
                        <span className="ml-1" style={{ fontStyle: 'italic' }}>(edited)</span>
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 max-w-[75%] sm:max-w-xs lg:max-w-md" style={{ backgroundColor: '#FFFFFF', borderRadius: '8px', height: '40px' }}>
                  <span style={{ fontSize: '12px', color: '#111625', lineHeight: '16px' }}>typing</span>
                  <div className="flex items-center gap-1 h-5 pt-1">
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms', backgroundColor: '#8B8B8B' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms', backgroundColor: '#8B8B8B' }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms', backgroundColor: '#8B8B8B' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ backgroundColor: '#FFFFFF', paddingTop: '8px' }}>
        <div className="relative flex items-center" style={{ height: '40px' }}>
          <input
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="w-full focus:outline-none transition-colors"
            style={{
              height: '40px',
              paddingLeft: '16px',
              paddingRight: '48px',
              borderRadius: '9999px',
              border: '1px solid #E8E5DF',
              color: '#404040',
              fontSize: '14px',
              fontWeight: 400,
              backgroundColor: '#FFFFFF'
            }}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || aiStreaming}
            className="absolute right-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '32px',
              backgroundColor: '#1E9A80',
              color: '#FFFFFF'
            }}
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        title="Delete Message"
        message="Are you sure you want to delete this message? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDeleteMessage}
        onCancel={() => {
          setDeleteModalOpen(false)
          setMessageToDelete(null)
        }}
        variant="danger"
      />
    </div>
  )
}

