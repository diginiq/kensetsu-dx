import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const participants = await prisma.conversationParticipant.findMany({
    where: { userId: session.user.id },
    include: {
      conversation: {
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      },
    },
  })

  let count = 0
  for (const p of participants) {
    const lastMsg = p.conversation.messages[0]
    if (lastMsg && lastMsg.createdAt > p.lastReadAt && lastMsg.senderId !== session.user.id) {
      count++
    }
  }

  return NextResponse.json({ count })
}
