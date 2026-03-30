import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyOnNewMessage } from '@/lib/notifyOnNewMessage'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const conversations = await prisma.conversation.findMany({
    where: {
      companyId: session.user.companyId ?? '',
      participants: { some: { userId: session.user.id } },
    },
    include: {
      participants: { include: { user: { select: { id: true, name: true, role: true } } } },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      _count: { select: { messages: true } },
    },
    orderBy: { lastMessageAt: 'desc' },
  })

  const userId = session.user.id
  const result = conversations.map((c) => {
    const participant = c.participants.find((p) => p.userId === userId)
    const unread = participant
      ? c.messages.filter((m) => m.createdAt > participant.lastReadAt && m.senderId !== userId).length > 0
      : false
    return {
      id: c.id,
      subject: c.subject,
      lastMessageAt: c.lastMessageAt,
      lastMessage: c.messages[0]?.body ?? '',
      lastSender: c.messages[0] ? c.participants.find((p) => p.userId === c.messages[0].senderId)?.user.name : '',
      participants: c.participants.map((p) => p.user),
      messageCount: c._count.messages,
      unread,
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '会社未所属' }, { status: 403 })

  const { subject, body, recipientIds } = await req.json() as {
    subject: string
    body: string
    recipientIds: string[]
  }

  if (!subject?.trim() || !body?.trim() || !recipientIds?.length) {
    return NextResponse.json({ error: '題名・本文・宛先は必須です' }, { status: 400 })
  }

  const allParticipantIds = [...new Set([session.user.id, ...recipientIds])]

  const conversation = await prisma.conversation.create({
    data: {
      companyId: session.user.companyId,
      subject: subject.trim(),
      lastMessageAt: new Date(),
      participants: {
        create: allParticipantIds.map((uid) => ({ userId: uid })),
      },
      messages: {
        create: { senderId: session.user.id, body: body.trim() },
      },
    },
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { id: true },
      },
    },
  })

  const firstId = conversation.messages[0]?.id
  if (firstId) await notifyOnNewMessage(firstId).catch(() => {})

  return NextResponse.json({ id: conversation.id }, { status: 201 })
}
