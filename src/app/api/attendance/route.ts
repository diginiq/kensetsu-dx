import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const siteId = searchParams.get('siteId')

  const companyId = session.user.companyId
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)
  const daysInMonth = new Date(year, month, 0).getDate()

  const workers = await prisma.user.findMany({
    where: { companyId, role: 'WORKER', isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const entries = await prisma.timeEntry.findMany({
    where: {
      user: { companyId },
      type: 'CLOCK_IN',
      timestamp: { gte: startOfMonth, lte: endOfMonth },
      ...(siteId ? { siteId } : {}),
    },
    select: { userId: true, timestamp: true, siteId: true },
  })

  // マトリクス構築: worker -> day -> present
  const matrix = workers.map((worker) => {
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1
      const present = entries.some((e) => {
        const d = new Date(e.timestamp)
        return e.userId === worker.id && d.getDate() === day &&
          d.getMonth() === month - 1 && d.getFullYear() === year
      })
      return { day, present }
    })
    const workDays = days.filter((d) => d.present).length
    return { workerId: worker.id, name: worker.name, days, workDays }
  })

  return NextResponse.json({ matrix, year, month, daysInMonth })
}
