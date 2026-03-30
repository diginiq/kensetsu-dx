import { prisma } from '@/lib/db'
import { toMessageSocketPayload } from '@/lib/messagePayload'
import { emitNewMessageToConversation } from '@/lib/realtimeServer'
import { sendNewMessageEmail } from '@/lib/email'
import { sendWebPushToUser } from '@/lib/pushNotifications'

function appBaseUrl(): string {
  return (process.env.NEXTAUTH_URL || '').replace(/\/$/, '')
}

/** 新規メッセージ作成後に Socket・メール・Web Push を送る */
export async function notifyOnNewMessage(messageId: string): Promise<void> {
  const msg = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      sender: { select: { id: true, name: true } },
      conversation: { select: { id: true, subject: true } },
    },
  })
  if (!msg) return

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId: msg.conversationId },
    include: { user: { select: { id: true, email: true, role: true, name: true } } },
  })

  const socketPayload = await toMessageSocketPayload({
    ...msg,
    sender: msg.sender,
  })

  emitNewMessageToConversation(
    msg.conversationId,
    socketPayload,
    participants.map((p) => p.userId),
    msg.senderId,
  )

  const preview = msg.body.length > 120 ? `${msg.body.slice(0, 120)}…` : msg.body
  const base = appBaseUrl()

  for (const p of participants) {
    if (p.userId === msg.senderId) continue
    const u = p.user
    const path =
      u.role === 'COMPANY_ADMIN'
        ? `/manage/messages/${msg.conversationId}`
        : `/app/messages/${msg.conversationId}`
    const openUrl = `${base}${path}`

    await sendNewMessageEmail({
      to: u.email,
      subject: `[建設DX] 新着メッセージ「${msg.conversation.subject}」`,
      text: `${msg.sender.name}さんからメッセージがあります。\n\n${preview}\n\n開く: ${openUrl}\n`,
    }).catch(() => {})

    await sendWebPushToUser(u.id, {
      title: `「${msg.conversation.subject}」`,
      body: `${msg.sender.name}: ${preview}`,
      url: openUrl,
    }).catch(() => {})
  }
}
