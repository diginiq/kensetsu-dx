import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { calcWorkingMinutes, formatMinutes } from '@/lib/reportUtils'

export default async function ReportStatsPage({
  searchParams,
}: {
  searchParams: { siteId?: string; year?: string; month?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const companyId = session.user.companyId
  const now = new Date()
  const year = parseInt(searchParams.year ?? String(now.getFullYear()))
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))
  const siteId = searchParams.siteId

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)

  const [sites, reports] = await Promise.all([
    prisma.site.findMany({
      where: { companyId, status: { not: 'ARCHIVED' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.dailyReport.findMany({
      where: {
        site: { companyId },
        reportDate: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['SUBMITTED', 'APPROVED'] },
        ...(siteId ? { siteId } : {}),
      },
      include: {
        user: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: { reportDate: 'asc' },
    }),
  ])

  // 現場別集計
  const siteStats: Record<string, {
    siteId: string; siteName: string
    reportCount: number; totalWorkMin: number
    workerSet: Set<string>; approvedCount: number
  }> = {}

  for (const r of reports) {
    if (!siteStats[r.siteId]) {
      siteStats[r.siteId] = {
        siteId: r.siteId, siteName: r.site.name,
        reportCount: 0, totalWorkMin: 0,
        workerSet: new Set(), approvedCount: 0,
      }
    }
    const s = siteStats[r.siteId]
    s.reportCount++
    s.workerSet.add(r.userId)
    if (r.status === 'APPROVED') s.approvedCount++
    if (r.endTime) s.totalWorkMin += calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes)
  }

  // ワーカー別集計（現場絞り込み時）
  const workerStats: Record<string, {
    userId: string; userName: string
    reportCount: number; totalWorkMin: number; approvedCount: number
  }> = {}
  for (const r of reports) {
    if (!workerStats[r.userId]) {
      workerStats[r.userId] = {
        userId: r.userId, userName: r.user.name,
        reportCount: 0, totalWorkMin: 0, approvedCount: 0,
      }
    }
    const w = workerStats[r.userId]
    w.reportCount++
    if (r.status === 'APPROVED') w.approvedCount++
    if (r.endTime) w.totalWorkMin += calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes)
  }

  // 日別集計
  const dayStats: Record<string, { reportCount: number; totalWorkMin: number }> = {}
  for (const r of reports) {
    const key = r.reportDate.toISOString().split('T')[0]
    if (!dayStats[key]) dayStats[key] = { reportCount: 0, totalWorkMin: 0 }
    dayStats[key].reportCount++
    if (r.endTime) dayStats[key].totalWorkMin += calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes)
  }

  const totalWorkMin = reports.reduce((sum, r) =>
    r.endTime ? sum + calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes) : sum, 0)
  const approvedRate = reports.length > 0
    ? Math.round((reports.filter((r) => r.status === 'APPROVED').length / reports.length) * 100)
    : 0

  const daysInMonth = new Date(year, month, 0).getDate()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/manage/reports" className="text-sm text-gray-500 hover:text-gray-700">← 日報管理</Link>
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mt-1">日報統計</h1>
        </div>
      </div>

      {/* フィルタ */}
      <form className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <select name="year" defaultValue={year}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
            <option key={y} value={y}>{y}年</option>
          ))}
        </select>
        <select name="month" defaultValue={month}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
            <option key={m} value={m}>{m}月</option>
          ))}
        </select>
        <select name="siteId" defaultValue={siteId ?? ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
          <option value="">全現場</option>
          {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <button type="submit" className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium">
          表示
        </button>
      </form>

      {/* サマリー */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '日報件数', value: `${reports.length}件`, color: '#E85D04' },
          { label: '総実働時間', value: formatMinutes(totalWorkMin), color: '#455A64' },
          { label: '承認率', value: `${approvedRate}%`, color: '#2E7D32' },
          { label: '延べ人員', value: `${new Set(reports.map((r) => r.userId)).size}名`, color: '#6B46C1' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* 日別稼働グラフ（棒グラフ風） */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-700 mb-4">日別 日報件数（{year}年{month}月）</h2>
        <div className="flex items-end gap-0.5 h-28">
          {Array.from({ length: daysInMonth }, (_, i) => {
            const key = `${year}-${String(month).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`
            const count = dayStats[key]?.reportCount ?? 0
            const maxCount = Math.max(...Object.values(dayStats).map((d) => d.reportCount), 1)
            const heightPct = Math.round((count / maxCount) * 100)
            const dow = new Date(year, month - 1, i + 1).getDay()
            const isWeekend = dow === 0 || dow === 6
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${i + 1}日: ${count}件`}>
                <div
                  className="w-full rounded-t"
                  style={{
                    height: `${heightPct}%`,
                    minHeight: count > 0 ? '4px' : '0',
                    backgroundColor: count > 0 ? (isWeekend ? '#9CA3AF' : '#E85D04') : 'transparent',
                  }}
                />
                {daysInMonth <= 31 && (
                  <span className={`text-xs ${isWeekend ? 'text-red-400' : 'text-gray-400'}`}>
                    {i + 1}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* 現場別集計 */}
      {!siteId && Object.keys(siteStats).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-700">現場別集計</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-2 text-gray-500 font-medium">現場名</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">日報数</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">実働時間</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">人員数</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">承認率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.values(siteStats).sort((a, b) => b.reportCount - a.reportCount).map((s) => (
                <tr key={s.siteId} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{s.siteName}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{s.reportCount}件</td>
                  <td className="px-5 py-3 text-right text-gray-700">{formatMinutes(s.totalWorkMin)}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{s.workerSet.size}名</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-medium ${s.approvedCount / s.reportCount >= 0.8 ? 'text-green-700' : 'text-orange-600'}`}>
                      {Math.round((s.approvedCount / s.reportCount) * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ワーカー別集計 */}
      {Object.keys(workerStats).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h2 className="font-bold text-gray-700">ワーカー別集計</h2>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-2 text-gray-500 font-medium">氏名</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">日報数</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">実働時間</th>
                <th className="text-right px-5 py-2 text-gray-500 font-medium">承認率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.values(workerStats).sort((a, b) => b.totalWorkMin - a.totalWorkMin).map((w) => (
                <tr key={w.userId} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">
                    <Link href={`/manage/workers/${w.userId}/profile`} className="hover:underline">
                      {w.userName}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-700">{w.reportCount}件</td>
                  <td className="px-5 py-3 text-right text-gray-700">{formatMinutes(w.totalWorkMin)}</td>
                  <td className="px-5 py-3 text-right">
                    <span className={`font-medium ${w.approvedCount / w.reportCount >= 0.8 ? 'text-green-700' : 'text-orange-600'}`}>
                      {Math.round((w.approvedCount / w.reportCount) * 100)}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {reports.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          {year}年{month}月の日報データがありません
        </div>
      )}
    </div>
  )
}
