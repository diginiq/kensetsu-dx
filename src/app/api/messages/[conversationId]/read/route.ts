import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  _req: Request,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const now = new Date()

  await prisma.conversationParticipant.updateMany({
    where: {
      conversationId: params.conversationId,
      userId: session.user.id,
    },
    data: { lastReadAt: now },
  })

  return NextResponse.json({ lastReadAt: now.toISOString() })
}
