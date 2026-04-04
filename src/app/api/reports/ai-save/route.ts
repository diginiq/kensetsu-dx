import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { canCreateAIReport } from '@/lib/roles'
import { prisma } from '@/lib/db'
import { notifyUsers } from '@/lib/appNotifications'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !canCreateAIReport(session.user.role)) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const body = await req.json()
  const {
    siteId,
    reportDate,
    reportType,
    weather,
    temperature,
    startTime,
    endTime,
    workCategories,
    memo,
    safetyNotes,
    transcription,
    photoIds,
  } = body as {
    siteId: string
    reportDate: string
    reportType: 'WORK_DIARY' | 'SITE_JOURNAL'
    weather: string
    temperature: number | null
    startTime: string // HH:MM
    endTime: string   // HH:MM
    workCategories: { category: string; description: string; workerCount: number }[]
    memo: string
    safetyNotes: string
    transcription: string
    photoIds: string[]
  }

  // 現場の会社確認
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { name: true, companyId: true },
  })
  if (!site || site.companyId !== session.user.companyId) {
    return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })
  }

  // 重複チェック
  const reportDateObj = new Date(reportDate)
  const startOfDay = new Date(reportDateObj.getFullYear(), reportDateObj.getMonth(), reportDateObj.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

  const existing = await prisma.dailyReport.findFirst({
    where: {
      userId: session.user.id,
      siteId,
      reportDate: { gte: startOfDay, lt: endOfDay },
    },
  })
  if (existing) {
    return NextResponse.json({ error: 'この現場・日付の日報はすでに存在します' }, { status: 400 })
  }

  // startTime / endTime を DateTime に変換（reportDate の日付を使う）
  const toDateTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number)
    const d = new Date(reportDateObj)
    d.setHours(h, m, 0, 0)
    return d
  }

  const report = await prisma.dailyReport.create({
    data: {
      siteId,
      userId: session.user.id,
      reportDate: reportDateObj,
      startTime: toDateTime(startTime || '08:00'),
      endTime: toDateTime(endTime || '17:00'),
      breakMinutes: 60,
      weather: weather || null,
      temperature: temperature ?? null,
      workCategories: workCategories ?? [],
      photos: photoIds ?? [],
      memo: memo || null,
      safetyNotes: safetyNotes || null,
      transcription: transcription || null,
      reportType,
      aiGenerated: true,
      status: 'SUBMITTED', // AI生成日報は即提出
    },
  })

  // 管理者・承認者へ通知
  const approvers = await prisma.user.findMany({
    where: {
      companyId: session.user.companyId,
      role: { in: ['COMPANY_ADMIN', 'SITE_SUPERVISOR'] },
      isActive: true,
    },
    select: { id: true },
  })

  const dateStr = reportDateObj.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
  const typeLabel = reportType === 'WORK_DIARY' ? '作業日報' : '工事日誌'

  notifyUsers(
    approvers.map((a) => a.id),
    {
      title: `${typeLabel}が提出されました`,
      body: `${session.user.name ?? ''}の${dateStr}（${site.name}）の${typeLabel}`,
      url: '/manage/reports',
    },
  ).catch(() => {})

  return NextResponse.json(report, { status: 201 })
}
