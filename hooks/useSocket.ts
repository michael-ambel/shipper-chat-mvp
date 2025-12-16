import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

interface UseSocketReturn {
  socket: Socket | null
  isConnected: boolean
  onlineUsers: string[]
}

export function useSocket(token: string | null): UseSocketReturn {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState<string[]>([])

  useEffect(() => {
    if (!token) {
      return
    }
    
    const socketUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : 'http://localhost:3000'
    
    const socketInstance = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketInstance.on('connect', () => {
      setIsConnected(true)
    })

    socketInstance.on('connect_error', () => {
      setIsConnected(false)
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('user_status', (data) => {
      setOnlineUsers(data.onlineUsers)
    })

    setSocket(socketInstance)

    return () => {
      socketInstance.disconnect()
    }
  }, [token])

  return { socket, isConnected, onlineUsers }
}
