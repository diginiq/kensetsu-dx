import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0]

  const startOfDay = new Date(dateStr)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(dateStr)
  endOfDay.setHours(23, 59, 59, 999)

  const entries = await prisma.timeEntry.findMany({
    where: {
      userId: session.user.id,
      timestamp: { gte: startOfDay, lte: endOfDay },
    },
    orderBy: { timestamp: 'asc' },
    include: { site: { select: { id: true, name: true } } },
  })

  return NextResponse.json(entries)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { siteId, type, latitude, longitude } = await req.json()

  if (!siteId) {
    return NextResponse.json({ error: '現場を選択してください' }, { status: 400 })
  }
  if (type !== 'CLOCK_IN' && type !== 'CLOCK_OUT') {
    return NextResponse.json({ error: '無効な打刻種別です' }, { status: 400 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // 当日の同種打刻重複チェック
  const existing = await prisma.timeEntry.findFirst({
    where: {
      userId: session.user.id,
      siteId,
      type,
      timestamp: { gte: today, lt: tomorrow },
    },
  })
  if (existing) {
    const label = type === 'CLOCK_IN' ? '出勤' : '退勤'
    return NextResponse.json({ error: `すでに${label}済みです` }, { status: 400 })
  }

  // CLOCK_OUT は CLOCK_IN が存在することを確認
  if (type === 'CLOCK_OUT') {
    const clockIn = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        siteId,
        type: 'CLOCK_IN',
        timestamp: { gte: today, lt: tomorrow },
      },
    })
    if (!clockIn) {
      return NextResponse.json({ error: '出勤打刻がありません' }, { status: 400 })
    }
  }

  // 現場がユーザーの会社に属することを確認
  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId ?? undefined },
  })
  if (!site) {
    return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })
  }

  const entry = await prisma.timeEntry.create({
    data: {
      userId: session.user.id,
      siteId,
      type,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    },
    include: { site: { select: { id: true, name: true } } },
  })

  return NextResponse.json(entry, { status: 201 })
}
