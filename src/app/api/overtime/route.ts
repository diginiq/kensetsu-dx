import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calcWorkingMinutes, calcOvertimeMinutes, minutesToHours } from '@/lib/reportUtils'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)
  const startOfYear = new Date(year, 0, 1)

  const companyId = session.user.companyId

  // 会社の全作業員
  const workers = await prisma.user.findMany({
    where: { companyId, role: 'WORKER', isActive: true },
    select: { id: true, name: true },
  })

  // 36協定設定を取得
  const settings = await prisma.overtimeSettings.findUnique({ where: { companyId } })
  const monthlyLimit = settings?.monthlyLimitHours ?? 45
  const yearlyLimit = settings?.yearlyLimitHours ?? 360
  const alertThreshold = settings?.alertThreshold ?? 30

  // 月間日報を取得
  const monthlyReports = await prisma.dailyReport.findMany({
    where: {
      site: { companyId },
      reportDate: { gte: startOfMonth, lte: endOfMonth },
      status: { in: ['SUBMITTED', 'APPROVED'] },
      endTime: { not: null },
    },
    select: { userId: true, startTime: true, endTime: true, breakMinutes: true },
  })

  // 年間日報を取得（残業時間だけ）
  const yearlyReports = await prisma.dailyReport.findMany({
    where: {
      site: { companyId },
      reportDate: { gte: startOfYear, lte: endOfMonth },
      status: { in: ['SUBMITTED', 'APPROVED'] },
      endTime: { not: null },
    },
    select: { userId: true, startTime: true, endTime: true, breakMinutes: true },
  })

  const result = workers.map((worker) => {
    const myMonthly = monthlyReports.filter((r) => r.userId === worker.id)
    const myYearly = yearlyReports.filter((r) => r.userId === worker.id)

    const monthlyWorkMin = myMonthly.reduce((sum, r) => {
      if (!r.endTime) return sum
      return sum + calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes)
    }, 0)
    const monthlyOvertimeMin = myMonthly.reduce((sum, r) => {
      if (!r.endTime) return sum
      return sum + calcOvertimeMinutes(calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes))
    }, 0)
    const yearlyOvertimeMin = myYearly.reduce((sum, r) => {
      if (!r.endTime) return sum
      return sum + calcOvertimeMinutes(calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes))
    }, 0)

    const monthlyOvertimeHours = minutesToHours(monthlyOvertimeMin)
    const yearlyOvertimeHours = minutesToHours(yearlyOvertimeMin)
    const monthlyWorkHours = minutesToHours(monthlyWorkMin)

    // アラートレベル
    let alertLevel: 'normal' | 'warning' | 'danger' = 'normal'
    if (monthlyOvertimeHours >= 40) alertLevel = 'danger'
    else if (monthlyOvertimeHours >= alertThreshold) alertLevel = 'warning'

    return {
      userId: worker.id,
      name: worker.name,
      monthlyWorkHours,
      monthlyOvertimeHours,
      yearlyOvertimeHours,
      monthlyLimitHours: monthlyLimit,
      yearlyLimitHours: yearlyLimit,
      monthlyUsageRate: Math.min(100, Math.round((monthlyOvertimeHours / monthlyLimit) * 100)),
      yearlyUsageRate: Math.min(100, Math.round((yearlyOvertimeHours / yearlyLimit) * 100)),
      alertLevel,
    }
  })

  return NextResponse.json({ workers: result, year, month, monthlyLimit, yearlyLimit })
}
