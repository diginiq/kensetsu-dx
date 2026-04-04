import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { canCreateAIReport } from '@/lib/roles'
import { checkAndLogAIUsage } from '@/lib/aiUsage'
import { generateReport, ReportType } from '@/lib/claudeAI'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !canCreateAIReport(session.user.role)) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const body = await req.json()
  const { transcription, siteId, reportType, reportDate } = body as {
    transcription: string
    siteId: string
    reportType: ReportType
    reportDate?: string // YYYY-MM-DD
  }

  if (!transcription || !siteId || !reportType) {
    return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
  }

  // 現場情報を取得
  const site = await prisma.site.findUnique({
    where: { id: siteId },
    select: { name: true, companyId: true },
  })
  if (!site || site.companyId !== session.user.companyId) {
    return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })
  }

  // AI使用量チェック・記録
  const usageError = await checkAndLogAIUsage({
    companyId: session.user.companyId,
    userId: session.user.id,
    feature: 'generate_report',
  })
  if (usageError) {
    return NextResponse.json({ error: usageError }, { status: 429 })
  }

  // 工事日誌（SITE_JOURNAL）の場合、当日の職長作業日報サマリーを収集
  let foremanSummaries = ''
  if (reportType === 'SITE_JOURNAL') {
    const targetDate = reportDate ? new Date(reportDate) : new Date()
    const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000)

    const foremanReports = await prisma.dailyReport.findMany({
      where: {
        siteId,
        reportType: 'WORK_DIARY',
        reportDate: { gte: startOfDay, lt: endOfDay },
        status: { in: ['SUBMITTED', 'APPROVED'] },
      },
      include: {
        user: { select: { name: true } },
      },
    })

    if (foremanReports.length > 0) {
      foremanSummaries = foremanReports
        .map((r) => {
          const workText = Array.isArray(r.workCategories)
            ? (r.workCategories as { category: string; description: string; workerCount: number }[])
                .map((w) => `  ・${w.category}（${w.workerCount}名）: ${w.description}`)
                .join('\n')
            : ''
          return `【${r.user.name}（職長）】\n${workText}\n備考: ${r.memo ?? 'なし'}`
        })
        .join('\n\n')
    }
  }

  const dateStr = reportDate ?? new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })

  try {
    const report = await generateReport({
      transcription,
      reportType,
      siteName: site.name,
      date: dateStr,
      foremanSummaries,
      usageCallback: (inputTokens, outputTokens) => {
        console.log(`Claude tokens: input=${inputTokens}, output=${outputTokens}`)
      },
    })
    return NextResponse.json(report)
  } catch (err) {
    console.error('Claude generate-report error:', err)
    return NextResponse.json({ error: 'レポートの生成に失敗しました' }, { status: 500 })
  }
}
