'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { Socket } from 'socket.io-client'
import { ChevronLeft, MessageCircleMore } from 'lucide-react'
import { MessageStatus } from './MessageStatus'

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
  deliveredAt?: string | null
  isRead?: boolean | null
  readAt?: string | null
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
}

export default function ChatWindow({ selectedUserId, selectedUserName, currentUserId, socket, onBack, isMobile, onUnreadChange, isAI }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [aiStreaming, setAiStreaming] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isTypingTimeoutRef = useRef<NodeJS.Timeout | null>(null)

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

    socket.on('message_delivered', handleMessageDelivered)
    socket.on('message_read', handleMessageRead)

    return () => {
      socket.off('message_delivered', handleMessageDelivered)
      socket.off('message_read', handleMessageRead)
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
      <div className="flex-1 flex items-center justify-center bg-white rounded-2xl">
        <div className="text-center">
          <MessageCircleMore className="w-10 h-10 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-medium text-black mb-2">
            Select a conversation
          </h3>
          <p className="text-gray-500">
            Choose a user from the list to start chatting
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl overflow-hidden shadow-sm">
      <div className="bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          {isMobile && (
            <button
              onClick={onBack}
              className="sm:hidden p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Back to users"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <h2 className={`text-lg font-bold text-black ${isMobile ? 'ml-auto' : ''}`}>
            {selectedUserName}
          </h2>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4 bg-white">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-black mx-auto mb-3"></div>
              <p className="text-gray-600">Loading messages...</p>
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <MessageCircleMore className="w-10 h-10 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500">
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((message) => {
              const isOwn = message.senderId === currentUserId
              return (
                <div
                  key={message.id}
                  className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-2xl ${
                      isOwn
                        ? 'bg-black text-white shadow-md'
                        : 'bg-white text-black shadow-sm'
                    }`}
                  >
                    <p className="wrap-break-word text-sm sm:text-base">{message.content}</p>
                    <p
                      className={`text-xs mt-1 flex items-center ${
                        isOwn ? 'text-gray-300' : 'text-gray-500'
                      }`}
                    >
                      <span>{formatTime(message.createdAt)}</span>
                      <MessageStatus
                        isOwn={isOwn}
                        deliveredAt={message.deliveredAt}
                        isRead={message.isRead}
                      />
                    </p>
                  </div>
                </div>
              )
            })}
            {isTyping && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 rounded-2xl bg-white text-gray-700 max-w-[75%] sm:max-w-xs lg:max-w-md shadow-sm">
                  <span className="text-sm leading-none">typing</span>
                  <div className="flex items-center gap-1 h-5 pt-1">
                    <span
                      className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    />
                    <span
                      className="w-1.5 h-1.5 bg-gray-600 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 sm:p-4 bg-white">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            className="flex-1 px-4 sm:px-5 py-3 text-sm sm:text-base rounded-full focus:outline-none bg-gray-100 hover:bg-gray-50 focus:bg-gray-50 transition-colors"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || aiStreaming}
            className="px-5 sm:px-7 py-3 text-sm sm:text-base bg-black text-white rounded-full hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

