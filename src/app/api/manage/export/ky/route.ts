import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')

  const records = await prisma.kYSubmission.findMany({
    where: {
      companyId: session.user.companyId,
      ...(dateFrom || dateTo
        ? {
            submittedDate: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59') } : {}),
            },
          }
        : {}),
    },
    include: {
      user: { select: { name: true } },
      site: { select: { name: true } },
      template: { select: { title: true } },
    },
    orderBy: { submittedDate: 'desc' },
  })

  const header = ['日付', '現場名', '作業員名', 'チェックリスト', 'チェック済み項目数', '全項目数', '特記事項']
  const rows = records.map((r) => {
    const items = r.items as { item: string; checked: boolean }[]
    const checkedCount = items.filter((i) => i.checked).length
    return [
      new Date(r.submittedDate).toLocaleDateString('ja-JP'),
      r.site.name,
      r.user.name,
      r.template?.title ?? '（テンプレートなし）',
      String(checkedCount),
      String(items.length),
      (r.notes ?? '').replace(/\n/g, ' '),
    ]
  })

  const csvContent = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const bom = '\uFEFF'
  return new NextResponse(bom + csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="ky_submissions_${new Date().toISOString().split('T')[0]}.csv"`,
    },
  })
}
