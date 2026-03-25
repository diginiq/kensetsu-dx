'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { Socket } from 'socket.io-client'
import { getSocket, disconnectSocket } from '@/lib/socket'
import { useNotification } from '@/hooks/useNotification'

interface SocketContextType {
  socket: Socket | null
  unreadCount: number
  refreshUnread: () => void
}

const SocketContext = createContext<SocketContextType>({ socket: null, unreadCount: 0, refreshUnread: () => {} })

export function useSocket() {
  return useContext(SocketContext)
}

export function SocketProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const { requestPermission, showNotification } = useNotification()

  const refreshUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/messages/unread-count')
      if (res.ok) {
        const data = await res.json()
        setUnreadCount(data.count)
      }
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    requestPermission()
  }, [requestPermission])

  useEffect(() => {
    const s = getSocket(userId)
    setSocket(s)
    refreshUnread()

    s.on('unread-update', (data: { message?: { senderName?: string; body?: string } }) => {
      refreshUnread()
      if (data.message) {
        showNotification(
          `${data.message.senderName ?? ''}からのメッセージ`,
          { body: data.message.body ?? '', tag: 'message' }
        )
      }
    })

    return () => {
      disconnectSocket()
    }
  }, [userId, refreshUnread, showNotification])

  return (
    <SocketContext.Provider value={{ socket, unreadCount, refreshUnread }}>
      {children}
    </SocketContext.Provider>
  )
}
