import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 通知一覧取得
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const cursor = searchParams.get('cursor')

  const notifications = await prisma.appNotification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  })

  const unreadCount = await prisma.appNotification.count({
    where: { userId: session.user.id, read: false },
  })

  return NextResponse.json({ notifications, unreadCount })
}

// 通知を既読にする
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { ids } = await req.json().catch(() => ({ ids: null }))

  if (ids === 'all') {
    await prisma.appNotification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    })
  } else if (Array.isArray(ids)) {
    await prisma.appNotification.updateMany({
      where: { userId: session.user.id, id: { in: ids } },
      data: { read: true },
    })
  }

  return NextResponse.json({ ok: true })
}
