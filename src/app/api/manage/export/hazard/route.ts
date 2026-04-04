import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const SEVERITY_LABEL: Record<string, string> = {
  LOW: '低',
  MEDIUM: '中',
  HIGH: '高',
}
const TYPE_LABEL: Record<string, string> = {
  NEAR_MISS: 'ヒヤリハット',
  INCIDENT: 'インシデント',
  ACCIDENT: '事故',
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const records = await prisma.hazardReport.findMany({
    where: {
      companyId: session.user.companyId,
      ...(dateFrom || dateTo
        ? {
            createdAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59') } : {}),
            },
          }
        : {}),
    },
    include: {
      reportedBy: { select: { name: true } },
      site: { select: { name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const header = ['日付', '現場名', '報告者', '種別', '深刻度', '負傷あり', '説明', '原因', '対策', 'ステータス']
  const rows = records.map((r) => [
    new Date(r.createdAt).toLocaleDateString('ja-JP'),
    r.site?.name ?? '',
    r.reportedBy.name,
    TYPE_LABEL[r.type] ?? r.type,
    SEVERITY_LABEL[r.severity] ?? r.severity,
    r.injured ? 'あり' : 'なし',
    r.description.replace(/\n/g, ' '),
    (r.cause ?? '').replace(/\n/g, ' '),
    (r.countermeasure ?? '').replace(/\n/g, ' '),
    r.status === 'OPEN' ? '未対応' : '対応済み',
  ])

  const csvContent = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom = '\uFEFF'
  return new NextResponse(bom + csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="hazard_reports_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
