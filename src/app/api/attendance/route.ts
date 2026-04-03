import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calcWorkingMinutes, minutesToHours } from '@/lib/reportUtils'

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

  // 日報（提出済み・承認済み）を取得して出勤・実働時間の根拠とする
  const reports = await prisma.dailyReport.findMany({
    where: {
      site: { companyId },
      reportDate: { gte: startOfMonth, lte: endOfMonth },
      status: { in: ['SUBMITTED', 'APPROVED'] },
      endTime: { not: null },
      ...(siteId ? { siteId } : {}),
    },
    select: {
      userId: true,
      reportDate: true,
      startTime: true,
      endTime: true,
      breakMinutes: true,
      status: true,
    },
  })

  // 日報がない日は TimeEntry(CLOCK_IN)でフォールバック
  const clockIns = await prisma.timeEntry.findMany({
    where: {
      user: { companyId },
      type: 'CLOCK_IN',
      timestamp: { gte: startOfMonth, lte: endOfMonth },
      ...(siteId ? { siteId } : {}),
    },
    select: { userId: true, timestamp: true },
  })

  const matrix = workers.map((worker) => {
    let totalWorkMinutes = 0

    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1

      // 当日の日報を探す
      const dayReports = reports.filter((r) => {
        const d = new Date(r.reportDate)
        return r.userId === worker.id &&
          d.getDate() === day &&
          d.getMonth() === month - 1 &&
          d.getFullYear() === year
      })

      if (dayReports.length > 0) {
        // 日報がある場合は実働時間を計算（複数現場対応で合算）
        const mins = dayReports.reduce((sum, r) => {
          if (!r.endTime) return sum
          return sum + calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes)
        }, 0)
        totalWorkMinutes += mins
        return { day, present: true, workMinutes: mins }
      }

      // 日報がなければ打刻ベースで出勤フラグのみ
      const hasClockIn = clockIns.some((e) => {
        const d = new Date(e.timestamp)
        return e.userId === worker.id &&
          d.getDate() === day &&
          d.getMonth() === month - 1 &&
          d.getFullYear() === year
      })

      return { day, present: hasClockIn, workMinutes: null }
    })

    const workDays = days.filter((d) => d.present).length
    const totalWorkHours = minutesToHours(totalWorkMinutes)

    return { workerId: worker.id, name: worker.name, days, workDays, totalWorkHours }
  })

  return NextResponse.json({ matrix, year, month, daysInMonth })
}
