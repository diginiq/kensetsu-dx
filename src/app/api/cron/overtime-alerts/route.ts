import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendMail, overtimeAlertHtml } from '@/lib/mail'
import { calcWorkingMinutes, calcOvertimeMinutes, minutesToHours } from '@/lib/reportUtils'
import { notifyUsers } from '@/lib/appNotifications'

// 外部cronサービスから呼び出す（月1回程度）
// Authorization: Bearer CRON_SECRET
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)
  const startOfYear = new Date(year, 0, 1)

  // 全アクティブ会社
  const companies = await prisma.company.findMany({
    where: { status: { not: 'SUSPENDED' } },
    select: {
      id: true,
      name: true,
      users: {
        where: { role: 'COMPANY_ADMIN', isActive: true },
        select: { id: true, email: true },
        take: 1,
      },
    },
  })

  let sentCount = 0
  const errors: string[] = []

  for (const company of companies) {
    const admin = company.users[0]
    if (!admin?.email) continue
    const adminEmail = admin.email

    // 36協定設定
    const settings = await prisma.overtimeSettings.findUnique({ where: { companyId: company.id } })
    const monthlyLimit = settings?.monthlyLimitHours ?? 45
    const yearlyLimit = settings?.yearlyLimitHours ?? 360
    const alertThreshold = settings?.alertThreshold ?? 30

    const workers = await prisma.user.findMany({
      where: { companyId: company.id, role: 'WORKER', isActive: true },
      select: { id: true, name: true },
    })

    const monthlyReports = await prisma.dailyReport.findMany({
      where: {
        site: { companyId: company.id },
        reportDate: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['SUBMITTED', 'APPROVED'] },
        endTime: { not: null },
      },
      select: { userId: true, startTime: true, endTime: true, breakMinutes: true },
    })

    const yearlyReports = await prisma.dailyReport.findMany({
      where: {
        site: { companyId: company.id },
        reportDate: { gte: startOfYear, lte: endOfMonth },
        status: { in: ['SUBMITTED', 'APPROVED'] },
        endTime: { not: null },
      },
      select: { userId: true, startTime: true, endTime: true, breakMinutes: true },
    })

    const alertWorkers = workers
      .map((worker) => {
        const myMonthly = monthlyReports.filter((r) => r.userId === worker.id)
        const myYearly = yearlyReports.filter((r) => r.userId === worker.id)

        const monthlyOvertimeMin = myMonthly.reduce((sum, r) => {
          if (!r.endTime) return sum
          return sum + calcOvertimeMinutes(calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes))
        }, 0)
        const yearlyOvertimeMin = myYearly.reduce((sum, r) => {
          if (!r.endTime) return sum
          return sum + calcOvertimeMinutes(calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes))
        }, 0)

        return {
          name: worker.name,
          monthlyOvertimeHours: minutesToHours(monthlyOvertimeMin),
          yearlyOvertimeHours: minutesToHours(yearlyOvertimeMin),
          monthlyLimit,
          yearlyLimit,
        }
      })
      .filter((w) => w.monthlyOvertimeHours >= alertThreshold)

    if (alertWorkers.length === 0) continue

    // アプリ内通知 + プッシュ + LINE
    const overLimit = alertWorkers.filter((w) => w.monthlyOvertimeHours >= w.monthlyLimit)
    notifyUsers([admin.id], {
      title: overLimit.length > 0 ? `⚠️ 36協定上限超過 ${overLimit.length}名` : `⏰ 残業時間アラート ${alertWorkers.length}名`,
      body: `${now.getMonth() + 1}月の残業時間を確認してください`,
      url: '/manage/overtime',
    }).catch(() => {})

    try {
      await sendMail({
        to: adminEmail,
        subject: `【建設DX】36協定アラート（${alertWorkers.length}名）${year}年${month}月`,
        html: overtimeAlertHtml(company.name, alertWorkers, year, month),
      })
      sentCount++
    } catch (e: unknown) {
      errors.push(`${company.name}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({
    sent: sentCount,
    total: companies.length,
    errors: errors.length > 0 ? errors : undefined,
  })
}
