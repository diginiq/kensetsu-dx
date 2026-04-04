import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendWebPushToUser } from '@/lib/pushNotifications'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  const siteId = searchParams.get('siteId')
  const status = searchParams.get('status')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  // WORKER: 自分の日報のみ / COMPANY_ADMIN: 自社全員
  const companyId = session.user.companyId
  const isAdmin = session.user.role === 'COMPANY_ADMIN' || session.user.role === 'SUPER_ADMIN'

  const reports = await prisma.dailyReport.findMany({
    where: {
      ...(isAdmin && companyId ? { site: { companyId } } : { userId: session.user.id }),
      ...(userId ? { userId } : {}),
      ...(siteId ? { siteId } : {}),
      ...(status ? { status: status as 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' } : {}),
      ...(dateFrom || dateTo ? {
        reportDate: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        }
      } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
      approvedBy: { select: { id: true, name: true } },
    },
    orderBy: { reportDate: 'desc' },
    take: 100,
  })

  return NextResponse.json(reports)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const body = await req.json()
  const { siteId, reportDate, startTime, endTime, breakMinutes, weather, workCategories, photos, memo, status } = body

  // 当日の日報重複チェック
  const reportDateObj = new Date(reportDate)
  const startOfDay = new Date(reportDateObj)
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(reportDateObj)
  endOfDay.setHours(23, 59, 59, 999)

  const existing = await prisma.dailyReport.findFirst({
    where: {
      userId: session.user.id,
      siteId,
      reportDate: { gte: startOfDay, lte: endOfDay },
    },
  })
  if (existing) {
    return NextResponse.json({ error: 'この現場・日付の日報はすでに存在します' }, { status: 400 })
  }

  const report = await prisma.dailyReport.create({
    data: {
      siteId,
      userId: session.user.id,
      reportDate: new Date(reportDate),
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      breakMinutes: breakMinutes ?? 60,
      weather: weather || null,
      workCategories: workCategories ?? [],
      photos: photos ?? [],
      memo: memo || null,
      status: status ?? 'DRAFT',
    },
  })

  // 提出時に管理者へプッシュ通知
  if (status === 'SUBMITTED') {
    const site = await prisma.site.findUnique({ where: { id: siteId }, select: { companyId: true, name: true } })
    if (site) {
      const admins = await prisma.user.findMany({
        where: { companyId: site.companyId, role: 'COMPANY_ADMIN', isActive: true },
        select: { id: true },
      })
      const dateStr = new Date(reportDate).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
      const workerName = session.user.name ?? '従業員'
      for (const admin of admins) {
        sendWebPushToUser(admin.id, {
          title: '日報が提出されました',
          body: `${workerName}さんの${dateStr}（${site.name}）の日報が提出されました`,
          url: '/manage/reports',
        }).catch(() => {})
      }
    }
  }

  return NextResponse.json(report, { status: 201 })
}
