import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 管理者による手動打刻追加
export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { userId, siteId, type, timestamp } = await req.json()

  if (!userId || !siteId || !type || !timestamp) {
    return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
  }
  if (type !== 'CLOCK_IN' && type !== 'CLOCK_OUT') {
    return NextResponse.json({ error: '無効な種別です' }, { status: 400 })
  }

  // 同じ会社のユーザーか確認
  const worker = await prisma.user.findFirst({
    where: { id: userId, companyId: session.user.companyId ?? undefined },
  })
  if (!worker) return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })

  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId ?? undefined },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const entry = await prisma.timeEntry.create({
    data: {
      userId,
      siteId,
      type,
      timestamp: new Date(timestamp),
    },
    include: {
      user: { select: { name: true } },
      site: { select: { name: true } },
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
