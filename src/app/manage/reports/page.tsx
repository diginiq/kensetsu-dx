import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { REPORT_STATUS_LABEL, REPORT_STATUS_COLOR, WorkCategory, calcWorkingMinutes, formatMinutes } from '@/lib/reportUtils'
import { ReportActions } from './ReportActions'

export default async function ManageReportsPage({
  searchParams,
}: {
  searchParams: { status?: string; userId?: string; siteId?: string; date?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const companyId = session.user.companyId
  const { status, userId, siteId, date } = searchParams

  const reports = await prisma.dailyReport.findMany({
    where: {
      site: { companyId },
      ...(status ? { status: status as 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' } : {}),
      ...(userId ? { userId } : {}),
      ...(siteId ? { siteId } : {}),
      ...(date ? {
        reportDate: {
          gte: new Date(date),
          lte: new Date(new Date(date).setHours(23, 59, 59, 999)),
        },
      } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: [{ reportDate: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  })

  const workers = await prisma.user.findMany({
    where: { companyId, role: 'WORKER', isActive: true },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const sites = await prisma.site.findMany({
    where: { companyId, status: { not: 'ARCHIVED' } },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  const statusOptions = [
    { value: '', label: 'すべて' },
    { value: 'SUBMITTED', label: '提出済み' },
    { value: 'APPROVED', label: '承認済み' },
    { value: 'REJECTED', label: '差戻し' },
    { value: 'DRAFT', label: '下書き' },
  ]

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">日報管理</h1>

      {/* フィルタ */}
      <form className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <select name="status" defaultValue={status ?? ''} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select name="userId" defaultValue={userId ?? ''} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">全従業員</option>
          {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <select name="siteId" defaultValue={siteId ?? ''} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">全現場</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <input type="date" name="date" defaultValue={date ?? ''} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        <button type="submit" className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium">絞り込み</button>
      </form>

      {/* 日報一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">日付</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">作業員</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">現場</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">実働</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">ステータス</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => {
                const workMin = r.endTime ? calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes) : null
                return (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {new Date(r.reportDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{r.user.name}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-32 truncate">{r.site.name}</td>
                    <td className="px-4 py-3 text-gray-600">{workMin ? formatMinutes(workMin) : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REPORT_STATUS_COLOR[r.status]}`}>
                        {REPORT_STATUS_LABEL[r.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ReportActions reportId={r.id} status={r.status} />
                    </td>
                  </tr>
                )
              })}
              {reports.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">日報がありません</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
