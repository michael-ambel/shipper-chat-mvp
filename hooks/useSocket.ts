import { useEffect, useState } from 'react'
import { Socket } from 'socket.io-client'
import { getSocket, disconnectSocket } from '@/lib/socket-client'

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
    if (!token) return

    const socketInstance = getSocket(token)

    socketInstance.on('connect', () => {
      setIsConnected(true)
    })

    socketInstance.on('disconnect', () => {
      setIsConnected(false)
    })

    socketInstance.on('user_status', (data) => {
      setOnlineUsers(data.onlineUsers)
    })

    setSocket(socketInstance)

    return () => {
      disconnectSocket()
    }
  }, [token])

  return { socket, isConnected, onlineUsers }
}

