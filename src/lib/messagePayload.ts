import type { Message, User } from '@prisma/client'
import { resolveMessageAttachmentUrl } from '@/lib/storage'

export type MessageSocketPayload = {
  id: string
  body: string
  senderId: string
  senderName: string
  createdAt: string
  fileUrl: string | null
  fileName: string | null
  fileType: string | null
}

export async function toMessageSocketPayload(
  msg: Message & { sender: Pick<User, 'id' | 'name'> },
): Promise<MessageSocketPayload> {
  const accessUrl = await resolveMessageAttachmentUrl(msg.fileUrl)
  return {
    id: msg.id,
    body: msg.body,
    senderId: msg.sender.id,
    senderName: msg.sender.name,
    createdAt: msg.createdAt.toISOString(),
    fileUrl: accessUrl,
    fileName: msg.fileName,
    fileType: msg.fileType,
  }
}
