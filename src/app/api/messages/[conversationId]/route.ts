import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resolveMessageAttachmentUrl } from '@/lib/storage'
import { notifyOnNewMessage } from '@/lib/notifyOnNewMessage'

export async function GET(
  _req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.conversationId, userId: session.user.id } },
  })
  if (!participant) return NextResponse.json({ error: 'アクセス権がありません' }, { status: 403 })

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
    include: {
      participants: { include: { user: { select: { id: true, name: true, role: true } } } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  })

  if (!conversation) return NextResponse.json({ error: '会話が見つかりません' }, { status: 404 })

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  })

  const messages = await Promise.all(
    conversation.messages.map(async (m) => ({
      ...m,
      fileAccessUrl: await resolveMessageAttachmentUrl(m.fileUrl),
    })),
  )

  return NextResponse.json({ ...conversation, messages })
}

export async function POST(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.conversationId, userId: session.user.id } },
  })
  if (!participant) return NextResponse.json({ error: 'アクセス権がありません' }, { status: 403 })

  const { body } = await req.json() as { body: string }
  if (!body?.trim()) return NextResponse.json({ error: '本文は必須です' }, { status: 400 })

  const message = await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      senderId: session.user.id,
      body: body.trim(),
    },
    include: { sender: { select: { id: true, name: true } } },
  })

  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { lastMessageAt: new Date() },
  })

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  })

  await notifyOnNewMessage(message.id).catch(() => {})

  const fileAccessUrl = await resolveMessageAttachmentUrl(message.fileUrl)
  return NextResponse.json({ ...message, fileAccessUrl }, { status: 201 })
}
