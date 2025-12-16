'use client'

import { useEffect, useState, useRef } from 'react'
import { Socket } from 'socket.io-client'
import { ChevronLeft, MessageCircleMore } from 'lucide-react'

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
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
}

export default function ChatWindow({ selectedUserId, selectedUserName, currentUserId, socket, onBack, isMobile }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedUserId) {
      loadSession()
    } else {
      setMessages([])
      setSessionId(null)
    }
  }, [selectedUserId])

  useEffect(() => {
    if (socket && sessionId) {
      socket.on('receive_message', (data) => {
        if (data.senderId === selectedUserId) {
          const newMessage: Message = {
            id: Date.now().toString(),
            content: data.message,
            senderId: data.senderId,
            createdAt: data.timestamp,
            sender: {
              id: data.senderId,
              name: selectedUserName || 'User',
              email: '',
              avatar: null,
            },
          }
          setMessages((prev) => [...prev, newMessage])
          scrollToBottom()
        }
      })

      return () => {
        socket.off('receive_message')
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
        }
      }
    } catch (error) {
    } finally {
      setLoading(false)
    }
  }

  const handleSend = async () => {
    if (!inputValue.trim() || !sessionId || !socket) return

    const messageContent = inputValue.trim()
    setInputValue('')

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
        })
      }
    } catch (error) {
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
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
      <div className="flex-1 flex items-center justify-center bg-white">
        <div className="text-center">
          <MessageCircleMore className="w-10 h-10 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-medium text-black mb-2">
            Select a conversation
          </h3>
          <p className="text-gray-600">
            Choose a user from the list to start chatting
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      <div className="p-4 border-b border-black flex items-center justify-between">
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

      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
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
              <p className="text-gray-600">
                No messages yet. Start the conversation!
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.senderId === currentUserId
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[75%] sm:max-w-xs lg:max-w-md px-3 sm:px-4 py-2 rounded-2xl ${
                    isOwn
                      ? 'bg-black text-white'
                      : 'bg-gray-200 text-black'
                  }`}
                >
                  <p className="break-words text-sm sm:text-base">{message.content}</p>
                  <p
                    className={`text-xs mt-1 ${
                      isOwn ? 'text-gray-300' : 'text-gray-600'
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 sm:p-4 border-t border-black">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Type a message..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-3 sm:px-4 py-2 text-sm sm:text-base border border-black rounded-full focus:outline-none focus:ring-2 focus:ring-black"
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="px-4 sm:px-6 py-2 text-sm sm:text-base bg-black text-white rounded-full hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  )
}

