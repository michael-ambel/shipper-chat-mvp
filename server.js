const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const dev = process.env.NODE_ENV !== 'production'
const port = parseInt(process.env.PORT || '3000', 10)

console.log('Starting server with config:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: port,
  DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'missing',
  JWT_SECRET: process.env.JWT_SECRET ? 'configured' : 'using default',
})

const app = next({ dev, port })
const handle = app.getRequestHandler()

const JWT_SECRET = process.env.JWT_SECRET || 'aeb6037bd8ddef01'
const onlineUsers = new Map()

app.prepare().then(() => {
  console.log('Next.js app prepared successfully')
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer, {
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

    try {
      const payload = jwt.verify(token, JWT_SECRET)
      socket.data.userId = payload.userId
      socket.data.email = payload.email
      next()
    } catch (error) {
      return next(new Error('Invalid token'))
    }
  })

  io.on('connection', async (socket) => {
    const userId = socket.data.userId

    onlineUsers.set(userId, socket.id)

    // Join user to all their group rooms
    try {
      const userGroups = await prisma.sessionParticipant.findMany({
        where: { userId, isActive: true },
        select: { sessionId: true },
      })
      for (const group of userGroups) {
        socket.join(`group:${group.sessionId}`)
      }
    } catch (error) {
      console.error('Error joining group rooms:', error)
    }
    
    io.emit('user_status', {
      userId,
      status: 'online',
      onlineUsers: Array.from(onlineUsers.keys()),
    })

    // Join a specific group room
    socket.on('join_group', (data) => {
      const { sessionId } = data
      if (sessionId) {
        socket.join(`group:${sessionId}`)
      }
    })

    // Leave a group room
    socket.on('leave_group', (data) => {
      const { sessionId } = data
      if (sessionId) {
        socket.leave(`group:${sessionId}`)
      }
    })

    // 1-1 message
    socket.on('send_message', async (data) => {
      const { recipientId, message, messageId, replyTo, replyToId } = data
      const recipientSocketId = onlineUsers.get(recipientId)
      const now = new Date()

      if (recipientSocketId) {
        if (messageId) {
          try {
            await prisma.message.update({
              where: { id: messageId },
              data: { deliveredAt: now },
            })
          } catch (error) {
          }
        }

        io.to(recipientSocketId).emit('receive_message', {
          senderId: userId,
          message,
          messageId,
          timestamp: now.toISOString(),
          replyTo,
          replyToId,
        })

        // Notify recipient to refresh unread counts
        io.to(recipientSocketId).emit('unread_count_changed')
      }

      socket.emit('message_sent', {
        recipientId,
        message,
        messageId,
        timestamp: now.toISOString(),
      })

      // Only emit delivered if recipient is online
      if (messageId && recipientSocketId) {
        socket.emit('message_delivered', {
          messageId,
          deliveredAt: now.toISOString(),
        })
      }
    })

    // Group message
    socket.on('send_group_message', async (data) => {
      const { sessionId, message, messageId, replyTo, replyToId, senderName } = data
      const now = new Date()

      if (messageId) {
        try {
          await prisma.message.update({
            where: { id: messageId },
            data: { deliveredAt: now },
          })
        } catch (error) {
        }
      }

      // Broadcast to all group members except sender
      socket.to(`group:${sessionId}`).emit('receive_group_message', {
        senderId: userId,
        senderName,
        sessionId,
        message,
        messageId,
        timestamp: now.toISOString(),
        replyTo,
        replyToId,
      })

      // Notify group members to refresh unread counts
      socket.to(`group:${sessionId}`).emit('unread_count_changed')

      socket.emit('message_sent', {
        sessionId,
        message,
        messageId,
        timestamp: now.toISOString(),
      })
    })

    // Group created - notify all members
    socket.on('group_created', (data) => {
      const { group, memberIds } = data
      
      // Notify ALL members about the new group (including creator)
      for (const memberId of memberIds) {
        const memberSocketId = onlineUsers.get(memberId)
        
        if (memberSocketId) {
          // Tell member to refresh their groups list
          io.to(memberSocketId).emit('group_created', { group })
          
          // Make them join the group room
          const memberSocket = io.sockets.sockets.get(memberSocketId)
          if (memberSocket) {
            memberSocket.join(`group:${group.id}`)
          }
        }
      }
    })

    // Group member added
    socket.on('group_member_added', (data) => {
      const { sessionId, member, memberId } = data
      
      // Make the new member join the room if online
      const memberSocketId = onlineUsers.get(memberId)
      
      if (memberSocketId) {
        const memberSocket = io.sockets.sockets.get(memberSocketId)
        if (memberSocket) {
          memberSocket.join(`group:${sessionId}`)
          
          // Notify the new member directly
          memberSocket.emit('added_to_group', { sessionId })
          
          // Also emit group_member_added to the new member
          memberSocket.emit('group_member_added', {
            sessionId,
            member,
            memberId,
          })
        }
      }
      
      // Notify ALL existing group members in the room
      io.to(`group:${sessionId}`).emit('group_member_added', {
        sessionId,
        member,
        memberId,
      })
    })

    // Group member removed
    socket.on('group_member_removed', (data) => {
      const { sessionId, memberId } = data
      socket.to(`group:${sessionId}`).emit('group_member_removed', {
        sessionId,
        memberId,
      })
    })

    // Group typing indicator
    socket.on('group_typing', (data) => {
      const { sessionId } = data
      socket.to(`group:${sessionId}`).emit('group_user_typing', {
        sessionId,
        userId,
      })
    })

    socket.on('group_stop_typing', (data) => {
      const { sessionId } = data
      socket.to(`group:${sessionId}`).emit('group_user_stop_typing', {
        sessionId,
        userId,
      })
    })

    socket.on('message_read', async (data) => {
      const { messageId } = data

      if (!messageId) return

      const now = new Date()

      try {
        const message = await prisma.message.update({
          where: { id: messageId },
          data: {
            isRead: true,
            readAt: now,
          },
          select: {
            senderId: true,
          },
        })
        
        const senderSocketId = onlineUsers.get(message.senderId)
        
        if (senderSocketId) {
          io.to(senderSocketId).emit('message_read', {
            messageId,
            readAt: now.toISOString(),
          })
        }

        // Notify current user (reader) to refresh unread counts
        socket.emit('unread_count_changed')
      } catch (error) {
      }
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

    // Edit message - broadcast to recipient
    socket.on('edit_message', async (data) => {
      const { messageId, content, recipientId, sessionId } = data

      if (!messageId || !content) return

      const recipientSocketId = onlineUsers.get(recipientId)

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('message_edited', {
          messageId,
          content,
          editedAt: new Date().toISOString(),
          sessionId,
        })
      }
    })

    // Delete message - broadcast to recipient
    socket.on('delete_message', async (data) => {
      const { messageId, recipientId, sessionId } = data

      if (!messageId) return

      const recipientSocketId = onlineUsers.get(recipientId)

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('message_deleted', {
          messageId,
          sessionId,
        })
      }
    })

    // Add reaction - broadcast to recipient
    socket.on('add_reaction', async (data) => {
      const { messageId, emoji, recipientId, sessionId, reaction, replaced } = data

      if (!messageId || !emoji) return

      const recipientSocketId = onlineUsers.get(recipientId)

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('reaction_added', {
          messageId,
          emoji,
          userId,
          sessionId,
          reaction,
          replaced,
        })
      }
    })

    // Remove reaction - broadcast to recipient
    socket.on('remove_reaction', async (data) => {
      const { messageId, emoji, recipientId, sessionId } = data

      if (!messageId || !emoji) return

      const recipientSocketId = onlineUsers.get(recipientId)

      if (recipientSocketId) {
        io.to(recipientSocketId).emit('reaction_removed', {
          messageId,
          emoji,
          userId,
          sessionId,
        })
      }
    })

    // Forward message - broadcast to each recipient
    socket.on('forward_message', async (data) => {
      const { forwardedMessages } = data

      if (!forwardedMessages || !Array.isArray(forwardedMessages)) return

      for (const msg of forwardedMessages) {
        const recipientSocketId = onlineUsers.get(msg.targetUserId)

        if (recipientSocketId) {
          io.to(recipientSocketId).emit('receive_message', {
            senderId: userId,
            message: msg,
            messageId: msg.id,
            timestamp: msg.createdAt,
            isForwarded: true,
          })

          io.to(recipientSocketId).emit('unread_count_changed')
        }
      }
    })

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId)
      
      const now = new Date()
      
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { lastSeen: now },
        })
      } catch (error) {
      }
      
      io.emit('user_status', {
        userId,
        status: 'offline',
        onlineUsers: Array.from(onlineUsers.keys()),
      })
    })
  })

  httpServer
    .once('error', (err) => {
      console.error('Server error:', err)
      process.exit(1)
    })
    .listen(port, '0.0.0.0', () => {
      console.log(`> Ready on http://0.0.0.0:${port}`)
      console.log('Server is listening and ready to accept connections')
    })
}).catch((err) => {
  console.error('Failed to prepare Next.js app:', err)
  process.exit(1)
})

