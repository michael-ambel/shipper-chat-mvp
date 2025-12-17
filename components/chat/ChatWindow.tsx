'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { ChevronLeft, MessageCircleMore, Send, Search, Phone, Video, MoreHorizontal, BotMessageSquare, X, Check, Forward, Users } from 'lucide-react'
import { toast } from 'sonner'
import { MessageStatus } from './MessageStatus'
import MessageActions from './MessageActions'
import MessageReactions from './MessageReactions'
import ConfirmModal from '../ui/ConfirmModal'
import ReplyPreview from './ReplyPreview'
import ForwardModal from './ForwardModal'

interface Reaction {
  id: string
  emoji: string
  userId: string
  user: {
    id: string
    name: string
  }
}

interface ReplyTo {
  id: string
  content: string
  senderId: string
  isDeleted?: boolean
  sender: {
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
  replyToId?: string | null
  replyTo?: ReplyTo | null
  isForwarded?: boolean
  forwardedFromId?: string | null
  originalSenderId?: string | null
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
  selectedGroupId?: string | null
  selectedGroupName?: string | null
  isGroupChat?: boolean
  currentUserId: string | null
  socket: Socket | null
  onBack: () => void
  isMobile: boolean
  onUnreadChange?: () => void
  isAI?: boolean
  onlineUsers?: string[]
  targetMessageId?: string | null
  onTargetMessageScrolled?: () => void
}

export default function ChatWindow({ selectedUserId, selectedUserName, selectedGroupId, selectedGroupName, isGroupChat = false, currentUserId, socket, onBack, isMobile, onUnreadChange, isAI, onlineUsers = [], targetMessageId, onTargetMessageScrolled }: ChatWindowProps) {
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
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null)
  const [openedFromSearch, setOpenedFromSearch] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [forwardModalOpen, setForwardModalOpen] = useState(false)
  const [forwardingMessage, setForwardingMessage] = useState<Message | null>(null)
  const [isForwarding, setIsForwarding] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messageRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const editInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (selectedUserId || (isGroupChat && selectedGroupId)) {
      loadSession()
    } else {
      setMessages([])
      setSessionId(null)
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      if (isTypingTimeoutRef.current) {
        clearTimeout(isTypingTimeoutRef.current)
      }
      setIsTyping(false)
      setHighlightedMessageId(null)
      setOpenedFromSearch(false)
    }
  }, [selectedUserId, selectedGroupId, isGroupChat])

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
            replyToId: data.replyToId || null,
            replyTo: data.replyTo || null,
            isForwarded: data.isForwarded || false,
            sender: {
              id: data.senderId,
              name: selectedUserName || 'User',
              email: '',
              avatar: null,
            },
          }
          setMessages((prev) => [...prev, newMessage])
          scrollToBottom()

          if (data.messageId) {
            markMessageAsRead(data.messageId)
          }
        }
      }

      socket.on('receive_message', handleReceiveMessage)

      const handleUserTyping = (data: any) => {
        if (data.userId === selectedUserId) {
          setIsTyping(true)
          
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

      // Group message handlers
      const handleReceiveGroupMessage = (data: any) => {
        if (data.sessionId === sessionId && data.senderId !== currentUserId) {
          const newMessage: Message = {
            id: data.messageId || Date.now().toString(),
            content: data.message,
            senderId: data.senderId,
            createdAt: data.timestamp,
            deliveredAt: data.timestamp,
            isRead: false,
            readAt: null,
            replyToId: data.replyToId || null,
            replyTo: data.replyTo || null,
            sender: {
              id: data.senderId,
              name: data.senderName || 'User',
              email: '',
              avatar: null,
            },
          }
          setMessages((prev) => [...prev, newMessage])
          scrollToBottom()

          if (data.messageId) {
            markMessageAsRead(data.messageId)
          }
        }
      }

      const handleGroupUserTyping = (data: any) => {
        if (data.sessionId === sessionId && data.userId !== currentUserId) {
          setIsTyping(true)
          
          if (isTypingTimeoutRef.current) {
            clearTimeout(isTypingTimeoutRef.current)
          }
          isTypingTimeoutRef.current = setTimeout(() => {
            setIsTyping(false)
          }, 3000)
        }
      }

      const handleGroupUserStopTyping = (data: any) => {
        if (data.sessionId === sessionId && data.userId !== currentUserId) {
          setIsTyping(false)
          if (isTypingTimeoutRef.current) {
            clearTimeout(isTypingTimeoutRef.current)
          }
        }
      }

      socket.on('receive_group_message', handleReceiveGroupMessage)
      socket.on('group_user_typing', handleGroupUserTyping)
      socket.on('group_user_stop_typing', handleGroupUserStopTyping)

      return () => {
        socket.off('receive_message', handleReceiveMessage)
        socket.off('user_typing', handleUserTyping)
        socket.off('user_stop_typing', handleUserStopTyping)
        socket.off('receive_group_message', handleReceiveGroupMessage)
        socket.off('group_user_typing', handleGroupUserTyping)
        socket.off('group_user_stop_typing', handleGroupUserStopTyping)
        if (isTypingTimeoutRef.current) {
          clearTimeout(isTypingTimeoutRef.current)
        }
      }
    }
  }, [socket, sessionId, selectedUserId, selectedUserName, currentUserId])

  useEffect(() => {
    if (targetMessageId) {
      setOpenedFromSearch(true)
    }
  }, [targetMessageId])

  useEffect(() => {
    if (!openedFromSearch && !targetMessageId) {
      scrollToBottom()
    }
  }, [messages])

  useEffect(() => {
    if (targetMessageId && messages.length > 0 && !loading && openedFromSearch) {
      const timer = setTimeout(() => {
        const targetElement = messageRefs.current[targetMessageId]
        if (targetElement) {
          targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
          setHighlightedMessageId(targetMessageId)
          
          setTimeout(() => {
            setHighlightedMessageId(null)
            onTargetMessageScrolled?.()
          }, 2000)
        } else {
          onTargetMessageScrolled?.()
          setOpenedFromSearch(false)
        }
      }, 200)
      
      return () => clearTimeout(timer)
    }
  }, [targetMessageId, messages, loading, openedFromSearch, onTargetMessageScrolled])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadSession = async () => {
    try {
      setLoading(true)
      
      let currentSessionId: string | null = null

      if (isGroupChat && selectedGroupId) {
        currentSessionId = selectedGroupId
        setSessionId(selectedGroupId)
      } else if (selectedUserId) {
        const sessionResponse = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ recipientId: selectedUserId }),
        })

        const sessionData = await sessionResponse.json()
        if (sessionResponse.ok) {
          currentSessionId = sessionData.session.id
          setSessionId(sessionData.session.id)
        }
      }

      if (currentSessionId) {
        const messagesResponse = await fetch(
          `/api/messages?sessionId=${currentSessionId}`
        )
        const messagesData = await messagesResponse.json()
        if (messagesResponse.ok) {
          setMessages(messagesData.messages)

          const unread = messagesData.messages.filter(
            (m: Message) =>
              m.senderId !== currentUserId && !m.isRead
          )

          if (unread.length > 0) {
            Promise.all(
              unread.map((m: Message) => markMessageAsRead(m.id, true))
            ).then(() => {
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

    if (isAI) {
      try {
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

    if (!socket) return

    try {
      const response = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          content: messageContent,
          ...(replyingTo && { replyToId: replyingTo.id }),
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setMessages((prev) => [...prev, data.message])
        setOpenedFromSearch(false)
        setReplyingTo(null)

        if (isGroupChat && selectedGroupId) {
          socket.emit('send_group_message', {
            sessionId: selectedGroupId,
            message: messageContent,
            messageId: data.message.id,
            replyTo: data.message.replyTo || null,
            replyToId: data.message.replyToId || null,
            senderName: data.message.sender?.name || 'You',
          })
        } else {
          socket.emit('send_message', {
            recipientId: selectedUserId,
            message: messageContent,
            messageId: data.message.id,
            replyTo: data.message.replyTo || null,
            replyToId: data.message.replyToId || null,
          })
        }
        
        setTimeout(() => scrollToBottom(), 100)
      }
    } catch (error) {
    }
  }

  const handleTyping = useCallback(() => {
    if (!socket) return

    if (isGroupChat && selectedGroupId) {
      socket.emit('group_typing', { sessionId: selectedGroupId })
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('group_stop_typing', { sessionId: selectedGroupId })
      }, 1500)
    } else if (selectedUserId) {
      socket.emit('typing', { recipientId: selectedUserId })

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }

      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('stop_typing', { recipientId: selectedUserId })
      }, 1500)
    }
  }, [socket, selectedUserId, selectedGroupId, isGroupChat])

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

  const handleReply = (message: Message) => {
    setReplyingTo(message)
  }

  const handleForward = (message: Message) => {
    setForwardingMessage(message)
    setForwardModalOpen(true)
  }

  const handleForwardSubmit = async (targetUserIds: string[]) => {
    if (!forwardingMessage) return

    setIsForwarding(true)
    try {
      const response = await fetch('/api/messages/forward', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: forwardingMessage.id,
          targetUserIds,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(`Message forwarded to ${targetUserIds.length} user${targetUserIds.length > 1 ? 's' : ''}`)

        if (socket) {
          socket.emit('forward_message', {
            forwardedMessages: data.messages,
          })
        }
      } else {
        toast.error('Failed to forward message')
      }
    } catch (error) {
      toast.error('Failed to forward message')
    } finally {
      setIsForwarding(false)
      setForwardModalOpen(false)
      setForwardingMessage(null)
    }
  }

  const scrollToMessage = (messageId: string) => {
    const messageEl = messageRefs.current[messageId]
    if (messageEl) {
      messageEl.scrollIntoView({ behavior: 'smooth', block: 'center' })
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
            
            let existingReactions = m.reactions || []
            if (data.replaced) {
              existingReactions = existingReactions.filter(
                (r) => r.userId !== currentUserId
              )
            }
            
            const alreadyExists = existingReactions.some(
              (r) => r.userId === currentUserId && r.emoji === emoji
            )
            if (alreadyExists) return m
            
            return { ...m, reactions: [...existingReactions, newReaction] }
          })
        )

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

  if (!selectedUserId && !selectedGroupId) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px' }}>
        <div className="text-center">
          <MessageCircleMore className="mx-auto mb-3" style={{ width: '32px', height: '32px', color: '#8B8B8B' }} />
          <h3 className="mb-1" style={{ fontSize: '14px', fontWeight: 500, color: '#09090B', lineHeight: '20px' }}>
            Select a conversation
          </h3>
          <p style={{ fontSize: '12px', fontWeight: 400, color: '#8B8B8B', lineHeight: '16px' }}>
            Choose a user or group from the list to start chatting
          </p>
        </div>
      </div>
    )
  }

  const isOnline = isAI || (selectedUserId && onlineUsers?.includes(selectedUserId))

  return (
    <div className="flex-1 flex flex-col overflow-hidden" style={{ backgroundColor: '#FFFFFF', borderRadius: '24px', padding: '12px' }}>
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
          {isGroupChat ? (
            <div 
              className="rounded-full flex items-center justify-center"
              style={{ 
                width: '40px', 
                height: '40px', 
                flexShrink: 0,
                backgroundColor: '#F0FDF4',
              }}
            >
              <Users className="w-5 h-5" style={{ color: '#1E9A80' }} />
            </div>
          ) : isAI ? (
            <div 
              className="rounded-full flex items-center justify-center"
              style={{ 
                width: '40px', 
                height: '40px', 
                flexShrink: 0,
                border: '2px solid #1E9A80',
                backgroundColor: 'transparent',
              }}
            >
              <BotMessageSquare className="w-6 h-6" style={{ color: '#1E9A80' }} />
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
          <div className="flex flex-col" style={{ gap: '2px' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 500, color: '#111625', lineHeight: '20px', letterSpacing: '-0.006em' }}>
              {isGroupChat ? selectedGroupName : selectedUserName}
            </h2>
            <span style={{ fontSize: '12px', fontWeight: 400, color: isGroupChat ? '#6B7280' : (isOnline ? '#38C793' : '#8B8B8B'), lineHeight: '16px' }}>
              {isGroupChat ? 'Group' : (isOnline ? 'Online' : 'Offline')}
            </span>
          </div>
        </div>

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
            onClick={() => toast.info('Coming soon')}
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
            onClick={() => toast.info('Coming soon')}
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
            onClick={() => toast.info('Coming soon')}
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
            onClick={() => toast.info('Coming soon')}
          >
            <MoreHorizontal size={16} color="#262626" />
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
              const isHighlighted = highlightedMessageId === message.id
              
              const showSenderName = isGroupChat && !isOwn && !isConsecutive
              
              return (
                <div
                  key={message.id}
                  ref={(el) => { messageRefs.current[message.id] = el }}
                  className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                  style={{ 
                    marginBottom: isConsecutive ? '4px' : '12px',
                  }}
                  onMouseEnter={() => setHoveredMessageId(message.id)}
                  onMouseLeave={() => setHoveredMessageId(null)}
                >
                  {showSenderName && (
                    <span style={{ fontSize: '11px', fontWeight: 500, color: '#1E9A80', marginBottom: '4px', marginLeft: '4px' }}>
                      {message.sender.name}
                    </span>
                  )}
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
                          className="relative max-w-[75%] sm:max-w-xs lg:max-w-md transition-all duration-500"
                          style={{
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            backgroundColor: isHighlighted 
                              ? (isOwn ? '#FFFFFF' : '#F0FBF2') 
                              : (message.isDeleted ? '#F3F4F6' : isOwn ? '#F0FDF4' : '#FFFFFF'),
                            borderRadius: '8px',
                            padding: isHighlighted ? '12px 16px' : '8px 12px',
                            opacity: message.isDeleted ? 0.7 : 1,
                            marginBottom: groupedReactions.length > 0 ? '8px' : 0,
                            boxShadow: isHighlighted ? '0 0 0 3px ' + (isOwn ? '#E5E7EB' : '#BBF7D0') : 'none',
                          }}
                        >
                          {message.isDeleted ? (
                            <p className="italic" style={{ fontSize: '12px', color: '#9CA3AF', lineHeight: '16px' }}>
                              This message was deleted
                            </p>
                          ) : (
                            <div style={{ width: '100%' }}>
                              {message.isForwarded && (
                                <div className="flex items-center" style={{ gap: '4px', marginBottom: '4px', opacity: 0.7 }}>
                                  <Forward size={12} style={{ color: '#6B7280' }} />
                                  <span style={{ fontSize: '11px', color: '#6B7280', fontStyle: 'italic' }}>
                                    Forwarded
                                  </span>
                                </div>
                              )}
                              {message.replyTo && (
                                <div
                                  onClick={() => scrollToMessage(message.replyTo!.id)}
                                  className="cursor-pointer hover:opacity-80 transition-opacity"
                                  style={{
                                    padding: '6px 8px',
                                    marginBottom: '6px',
                                    backgroundColor: isOwn ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.03)',
                                    borderLeft: '2px solid #1E9A80',
                                    borderRadius: '0 4px 4px 0',
                                  }}
                                >
                                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#1E9A80', marginBottom: '2px' }}>
                                    {message.replyTo.senderId === currentUserId ? 'You' : message.replyTo.sender.name}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }}>
                                    {message.replyTo.isDeleted ? 'This message was deleted' : message.replyTo.content}
                                  </div>
                                </div>
                              )}
                              <p className="wrap-break-word" style={{ fontSize: '12px', color: '#111625', lineHeight: '16px' }}>
                                {message.content}
                              </p>
                            </div>
                          )}
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
                            onReply={() => handleReply(message)}
                            onForward={() => handleForward(message)}
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
        {replyingTo && !isAI && (
          <div style={{ marginBottom: '8px' }}>
            <ReplyPreview
              replyTo={{
                id: replyingTo.id,
                content: replyingTo.content,
                senderId: replyingTo.senderId,
                sender: {
                  id: replyingTo.sender.id,
                  name: replyingTo.sender.name,
                },
              }}
              currentUserId={currentUserId || ''}
              onCancel={() => setReplyingTo(null)}
            />
          </div>
        )}
        <div className="relative flex items-center" style={{ height: '40px' }}>
          <input
            type="text"
            placeholder={replyingTo ? 'Type your reply...' : 'Type a message...'}
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

      <ForwardModal
        isOpen={forwardModalOpen}
        onClose={() => {
          setForwardModalOpen(false)
          setForwardingMessage(null)
        }}
        onForward={handleForwardSubmit}
        messageContent={forwardingMessage?.content || ''}
        currentUserId={currentUserId || ''}
        isLoading={isForwarding}
      />
    </div>
  )
}
