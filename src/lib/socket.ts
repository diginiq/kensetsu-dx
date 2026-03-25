import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export function getSocket(userId: string): Socket {
  if (!socket) {
    socket = io({
      path: '/ws',
      auth: { userId },
      transports: ['websocket', 'polling'],
      autoConnect: true,
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
