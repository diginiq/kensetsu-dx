import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))
  const siteId = searchParams.get('siteId') || undefined

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)

  const entries = await prisma.timeEntry.findMany({
    where: {
      user: { companyId: session.user.companyId },
      timestamp: { gte: startOfMonth, lte: endOfMonth },
      ...(siteId ? { siteId } : {}),
    },
    include: {
      user: { select: { name: true } },
      site: { select: { name: true } },
    },
    orderBy: [{ timestamp: 'asc' }, { userId: 'asc' }],
  })

  const headers = ['日時', '従業員名', '現場名', '種別', '緯度', '経度']
  const rows = entries.map((e) => [
    new Date(e.timestamp).toLocaleString('ja-JP', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
    }),
    e.user.name,
    e.site.name,
    e.type === 'CLOCK_IN' ? '出勤' : '退勤',
    e.latitude !== null ? String(e.latitude) : '',
    e.longitude !== null ? String(e.longitude) : '',
  ])

  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const bom = '\uFEFF'
  const filename = encodeURIComponent(`打刻記録_${year}年${month}月.csv`)

  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
