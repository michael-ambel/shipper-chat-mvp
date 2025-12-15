import { Server as HTTPServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { verifyToken } from './auth'

export type SocketServer = SocketIOServer

const onlineUsers = new Map<string, string>()

export function initializeSocket(httpServer: HTTPServer): SocketIOServer {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
      credentials: true,
    },
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth.token
    if (!token) {
      return next(new Error('Authentication error'))
    }

    const payload = verifyToken(token)
    if (!payload) {
      return next(new Error('Invalid token'))
    }

    socket.data.userId = payload.userId
    socket.data.email = payload.email
    next()
  })

  io.on('connection', (socket) => {
    const userId = socket.data.userId

    onlineUsers.set(userId, socket.id)
    io.emit('user_status', {
      userId,
      status: 'online',
      onlineUsers: Array.from(onlineUsers.keys()),
    })

    socket.on('send_message', async (data) => {
      const { recipientId, message } = data
      const recipientSocketId = onlineUsers.get(recipientId)

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('receive_message', {
          senderId: userId,
          message,
          timestamp: new Date().toISOString(),
        })
      }

      socket.emit('message_sent', {
        recipientId,
        message,
        timestamp: new Date().toISOString(),
      })
    })

    socket.on('typing', (data) => {
      const { recipientId } = data
      const recipientSocketId = onlineUsers.get(recipientId)

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_typing', {
          userId,
        })
      }
    })

    socket.on('stop_typing', (data) => {
      const { recipientId } = data
      const recipientSocketId = onlineUsers.get(recipientId)

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('user_stop_typing', {
          userId,
        })
      }
    })

    socket.on('disconnect', () => {
      onlineUsers.delete(userId)
      io.emit('user_status', {
        userId,
        status: 'offline',
        onlineUsers: Array.from(onlineUsers.keys()),
      })
    })
  })

  return io
}

export function getOnlineUsers(): string[] {
  return Array.from(onlineUsers.keys())
}

