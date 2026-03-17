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

  // CLOCK_INの重複チェック（当日）
  if (type === 'CLOCK_IN') {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const existing = await prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        siteId,
        type: 'CLOCK_IN',
        timestamp: { gte: today, lt: tomorrow },
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'すでに出勤済みです' }, { status: 400 })
    }
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
