import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { REPORT_STATUS_LABEL, REPORT_STATUS_COLOR, calcWorkingMinutes, formatMinutes } from '@/lib/reportUtils'
import { ReportTable } from './ReportTable'

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

  const serialized = reports.map((r) => ({
    id: r.id,
    reportDate: r.reportDate.toISOString(),
    startTime: r.startTime.toISOString(),
    endTime: r.endTime?.toISOString() ?? null,
    breakMinutes: r.breakMinutes,
    weather: r.weather,
    temperature: r.temperature,
    workCategories: r.workCategories as any,
    memo: r.memo,
    status: r.status,
    rejectReason: r.rejectReason,
    user: r.user,
    site: r.site,
    approvedBy: r.approvedBy,
  }))

  const submittedCount = reports.filter((r) => r.status === 'SUBMITTED').length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">日報管理</h1>
        {submittedCount > 0 && (
          <span className="text-sm text-blue-700 font-medium bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-lg">
            承認待ち {submittedCount}件
          </span>
        )}
      </div>

      {/* フィルタ */}
      <form className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <select name="status" defaultValue={status ?? ''} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">すべて</option>
          <option value="SUBMITTED">提出済み</option>
          <option value="APPROVED">承認済み</option>
          <option value="REJECTED">差戻し</option>
          <option value="DRAFT">下書き</option>
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

      <ReportTable reports={serialized} />
    </div>
  )
}
