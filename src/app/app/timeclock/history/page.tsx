import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { TimeclockHistoryClient } from './TimeclockHistoryClient'

export default async function TimeclockHistoryPage({
  searchParams,
}: {
  searchParams: { year?: string; month?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const now = new Date()
  const year = parseInt(searchParams.year ?? String(now.getFullYear()))
  const month = parseInt(searchParams.month ?? String(now.getMonth() + 1))

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)

  const [entries, amendRequests, sites] = await Promise.all([
    prisma.timeEntry.findMany({
      where: {
        userId: session.user.id,
        timestamp: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { site: { select: { id: true, name: true } } },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.timeclockAmendRequest.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.siteAssignment.findMany({
      where: { userId: session.user.id },
      include: { site: { select: { id: true, name: true, status: true } } },
    }),
  ])

  // 日付ごとにグループ化
  const byDate: Record<string, typeof entries> = {}
  for (const e of entries) {
    const key = e.timestamp.toISOString().split('T')[0]
    if (!byDate[key]) byDate[key] = []
    byDate[key].push(e)
  }

  // 月間合計（出勤〜退勤のペアを計算）
  let totalWorkMin = 0
  for (const dayEntries of Object.values(byDate)) {
    const clockIns = dayEntries.filter((e) => e.type === 'CLOCK_IN')
    const clockOuts = dayEntries.filter((e) => e.type === 'CLOCK_OUT')
    if (clockIns.length > 0 && clockOuts.length > 0) {
      const inTime = clockIns[0].timestamp.getTime()
      const outTime = clockOuts[clockOuts.length - 1].timestamp.getTime()
      if (outTime > inTime) totalWorkMin += Math.floor((outTime - inTime) / 60000)
    }
  }

  const activeSites = sites
    .filter((a) => a.site.status === 'ACTIVE')
    .map((a) => ({ id: a.site.id, name: a.site.name }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link href="/app/timeclock" className="text-white/80 hover:text-white">←</Link>
          <p className="font-bold">打刻履歴</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-5 space-y-5 pb-24">
        {/* 月選択 */}
        <form className="flex gap-2">
          <select name="year" defaultValue={year}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => (
              <option key={y} value={y}>{y}年</option>
            ))}
          </select>
          <select name="month" defaultValue={month}
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{m}月</option>
            ))}
          </select>
          <button type="submit"
            className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium">
            表示
          </button>
        </form>

        {/* 月間サマリー */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500">出勤日数</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#E85D04' }}>
              {Object.keys(byDate).length}日
            </p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-xs text-gray-500">打刻合計時間</p>
            <p className="text-2xl font-bold mt-1" style={{ color: '#455A64' }}>
              {totalWorkMin > 0
                ? `${Math.floor(totalWorkMin / 60)}h${totalWorkMin % 60 > 0 ? `${totalWorkMin % 60}m` : ''}`
                : '-'}
            </p>
          </div>
        </div>

        {/* 日別打刻一覧 */}
        {Object.keys(byDate).length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            {year}年{month}月の打刻記録がありません
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(byDate)
              .sort(([a], [b]) => b.localeCompare(a))
              .map(([date, dayEntries]) => {
                const d = new Date(date + 'T00:00:00')
                const clockIn = dayEntries.find((e) => e.type === 'CLOCK_IN')
                const clockOut = [...dayEntries].reverse().find((e) => e.type === 'CLOCK_OUT')
                const workMin = clockIn && clockOut
                  ? Math.floor((clockOut.timestamp.getTime() - clockIn.timestamp.getTime()) / 60000)
                  : null
                return (
                  <div key={date} className="bg-white rounded-xl border border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium text-gray-800">
                        {d.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
                      </p>
                      {workMin !== null && (
                        <span className="text-sm font-medium text-gray-600">
                          {Math.floor(workMin / 60)}h{workMin % 60 > 0 ? `${workMin % 60}m` : ''}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayEntries.map((e) => (
                        <div key={e.id} className="flex items-center gap-2 text-sm">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            e.type === 'CLOCK_IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {e.type === 'CLOCK_IN' ? '出勤' : '退勤'}
                          </span>
                          <span className="text-gray-700 font-medium">
                            {e.timestamp.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span className="text-gray-400 text-xs truncate">{e.site.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
          </div>
        )}

        {/* 修正申請 */}
        <TimeclockHistoryClient
          sites={activeSites}
          amendRequests={amendRequests.map((r) => ({
            id: r.id,
            type: r.type,
            requestedTimestamp: r.requestedTimestamp.toISOString(),
            reason: r.reason,
            status: r.status,
            reviewNote: r.reviewNote,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  )
}
