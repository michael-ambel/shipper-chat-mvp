const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

const dev = process.env.NODE_ENV !== 'production'
const hostname = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

const JWT_SECRET = process.env.JWT_SECRET || 'aeb6037bd8ddef01'
const onlineUsers = new Map()

app.prepare().then(() => {
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
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})

