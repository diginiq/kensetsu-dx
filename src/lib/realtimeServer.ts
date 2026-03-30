import type { Server } from 'socket.io'
import type { MessageSocketPayload } from '@/lib/messagePayload'

function getIo(): Server | undefined {
  return (globalThis as { io?: Server }).io
}

/** APIルートから Socket.io へ新着メッセージを配信（カスタムサーバー起動時のみ有効） */
export function emitNewMessageToConversation(
  conversationId: string,
  payload: MessageSocketPayload,
  participantIds: string[],
  senderUserId: string,
) {
  const io = getIo()
  if (!io) return

  io.to(`conv:${conversationId}`).emit('new-message', payload)

  const userSockets = (globalThis as { userSockets?: Map<string, Set<string>> }).userSockets
  if (!participantIds?.length || !userSockets) return

  participantIds.forEach((uid) => {
    if (uid === senderUserId) return
    const set = userSockets.get(uid)
    if (!set) return
    set.forEach((sid) => {
      io.to(sid).emit('unread-update', {
        conversationId,
        message: { senderName: payload.senderName, body: payload.body },
      })
    })
  })
}

export function emitReadUpdate(
  conversationId: string,
  userId: string,
  lastReadAt: string,
) {
  const io = getIo()
  if (!io) return
  io.to(`conv:${conversationId}`).emit('read-update', {
    conversationId,
    userId,
    lastReadAt,
  })
}
