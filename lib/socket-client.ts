import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(token: string): Socket {
  if (!socket || !socket.connected) {
    const socketUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3000'
    socket = io(socketUrl, {
      auth: { token },
      autoConnect: true,
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

