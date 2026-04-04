import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { HazardList } from './HazardList'

const TYPE_LABEL: Record<string, string> = {
  NEAR_MISS: 'ヒヤリハット',
  ACCIDENT: '事故・災害',
  UNSAFE_CONDITION: '危険箇所',
}
const SEVERITY_LABEL: Record<string, string> = { LOW: '軽微', MEDIUM: '中程度', HIGH: '重大' }

export default async function ManageHazardPage({
  searchParams,
}: {
  searchParams: { siteId?: string; status?: string; severity?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const companyId = session.user.companyId

  const [sites, reports] = await Promise.all([
    prisma.site.findMany({
      where: { companyId, status: { not: 'ARCHIVED' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.hazardReport.findMany({
      where: {
        companyId,
        ...(searchParams.siteId ? { siteId: searchParams.siteId } : {}),
        ...(searchParams.status ? { status: searchParams.status } : {}),
        ...(searchParams.severity ? { severity: searchParams.severity } : {}),
      },
      include: {
        site: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, name: true } },
      },
      orderBy: { occurredAt: 'desc' },
      take: 100,
    }),
  ])

  const openCount = reports.filter((r) => r.status === 'OPEN').length
  const highCount = reports.filter((r) => r.severity === 'HIGH').length
  const injuredCount = reports.filter((r) => r.injured).length

  const serialized = reports.map((r) => ({
    id: r.id,
    type: r.type,
    typeLabel: TYPE_LABEL[r.type] ?? r.type,
    severity: r.severity,
    severityLabel: SEVERITY_LABEL[r.severity] ?? r.severity,
    location: r.location,
    description: r.description,
    cause: r.cause,
    countermeasure: r.countermeasure,
    injured: r.injured,
    injuredCount: r.injuredCount,
    status: r.status,
    occurredAt: r.occurredAt.toISOString(),
    siteName: r.site.name,
    reporterName: r.reportedBy.name,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">ヒヤリハット管理</h1>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '未対応', value: openCount, color: '#E85D04' },
          { label: '重大案件', value: highCount, color: '#C62828' },
          { label: '負傷あり', value: injuredCount, color: '#6A1B9A' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* フィルタ */}
      <form className="flex flex-wrap gap-2 bg-white p-4 rounded-xl border border-gray-200">
        <select name="siteId" defaultValue={searchParams.siteId ?? ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">全現場</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select name="status" defaultValue={searchParams.status ?? ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">全ステータス</option>
          <option value="OPEN">未対応</option>
          <option value="CLOSED">対応済み</option>
        </select>
        <select name="severity" defaultValue={searchParams.severity ?? ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">全重要度</option>
          <option value="HIGH">重大</option>
          <option value="MEDIUM">中程度</option>
          <option value="LOW">軽微</option>
        </select>
        <button type="submit"
          className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium">
          絞り込み
        </button>
      </form>

      <HazardList reports={serialized} />

      {reports.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          ヒヤリハット報告がありません
        </div>
      )}
    </div>
  )
}
