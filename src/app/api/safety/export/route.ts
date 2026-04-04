import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const DOC_TYPE_LABELS: Record<string, string> = {
  SUBCONTRACT_NOTIFICATION: '再下請負通知書（様式1号）',
  WORKER_ROSTER: '作業員名簿（様式2号）',
  CONSTRUCTION_SYSTEM: '施工体制台帳（様式3号）',
  SAFETY_PLAN: '工事作業所安全衛生計画書（様式6号）',
  NEW_ENTRY_SURVEY: '新規入場者調査票（様式7号）',
  SAFETY_MEETING: '安全ミーティング報告書（様式8号）',
  FIRE_USE_PERMIT: '火気使用願（様式9号）',
  EQUIPMENT_ENTRY: '持込機械届（様式11号）',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '下書き',
  SUBMITTED: '提出済み',
  ACCEPTED: '受理',
  REJECTED: '差戻し',
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId') || undefined
  const status = searchParams.get('status') || undefined

  const docs = await prisma.safetyDocument.findMany({
    where: {
      companyId: session.user.companyId,
      ...(siteId ? { siteId } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: {
      site: { select: { name: true } },
    },
    orderBy: [{ siteId: 'asc' }, { documentType: 'asc' }, { createdAt: 'desc' }],
  })

  const headers = ['タイトル', '書類種別', '現場名', 'ステータス', '提出日', '作成日', '更新日', '差戻しコメント']
  const rows = docs.map((d) => [
    d.title,
    DOC_TYPE_LABELS[d.documentType] ?? d.documentType,
    d.site.name,
    STATUS_LABELS[d.status] ?? d.status,
    d.submittedAt ? new Date(d.submittedAt).toLocaleDateString('ja-JP') : '',
    new Date(d.createdAt).toLocaleDateString('ja-JP'),
    new Date(d.updatedAt).toLocaleDateString('ja-JP'),
    d.reviewComment ?? '',
  ])

  const csv = [headers, ...rows].map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n')
  const bom = '\uFEFF'
  const filename = encodeURIComponent('安全書類一覧.csv')

  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
