import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { REPORT_STATUS_LABEL, REPORT_STATUS_COLOR, calcWorkingMinutes, formatMinutes } from '@/lib/reportUtils'
import { canCreateAIReport } from '@/lib/roles'

export default async function AppReportsPage({
  searchParams,
}: {
  searchParams: { month?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const now = new Date()
  const targetMonth = searchParams.month
    ? new Date(searchParams.month + '-01')
    : new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
  const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0, 23, 59, 59)
  const prevMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() - 1, 1)
  const nextMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 1)
  const isCurrentMonth = targetMonth.getFullYear() === now.getFullYear() && targetMonth.getMonth() === now.getMonth()

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const reports = await prisma.dailyReport.findMany({
    where: {
      userId: session.user.id,
      reportDate: { gte: startOfMonth, lte: endOfMonth },
    },
    select: {
      id: true,
      reportDate: true,
      startTime: true,
      endTime: true,
      breakMinutes: true,
      status: true,
      site: { select: { name: true } },
    },
    orderBy: { reportDate: 'desc' },
  })

  const todayReport = isCurrentMonth
    ? reports.find((r) => {
        const d = new Date(r.reportDate)
        return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate()
      })
    : undefined

  // 今月の統計
  const totalWorkMin = reports.reduce((sum, r) => {
    if (!r.endTime) return sum
    return sum + calcWorkingMinutes(new Date(r.startTime), new Date(r.endTime), r.breakMinutes)
  }, 0)
  const submittedCount = reports.filter(r => r.status === 'SUBMITTED' || r.status === 'APPROVED').length
  const draftCount = reports.filter(r => r.status === 'DRAFT').length
  const rejectedCount = reports.filter(r => r.status === 'REJECTED').length

  // 今月の未提出平日を検出（現在月のみ）
  const reportedDates = new Set(reports.map((r) => {
    const d = new Date(r.reportDate)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  }))
  const missingDates: string[] = []
  if (isCurrentMonth) {
    for (let i = 1; i < today.getDate(); i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), i)
      if (d.getDay() !== 0 && d.getDay() !== 6) {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        if (!reportedDates.has(key)) {
          missingDates.push(d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }))
        }
      }
    }
  }

  const monthLabel = targetMonth.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })
  const prevMonthParam = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`
  const nextMonthParam = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, '0')}`

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="KSDX" width={32} height={32} className="rounded" />
            <p className="font-bold">日報</p>
          </div>
          <Link href="/app" className="text-xs text-white/80 hover:text-white px-2 py-1">← 現場</Link>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-5 space-y-4">
        {/* 今日の日報（当月のみ） */}
        {isCurrentMonth && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800">今日の日報</p>
              <p className="text-xs text-gray-400">{now.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
            </div>
            {todayReport ? (
              <div className="flex items-center justify-between">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${REPORT_STATUS_COLOR[todayReport.status]}`}>
                  {REPORT_STATUS_LABEL[todayReport.status]}
                </span>
                <Link href={`/app/reports/${todayReport.id}`} className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">
                  確認・編集
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {canCreateAIReport(session.user.role) && (
                  <Link
                    href="/app/reports/new-ai"
                    className="block w-full py-3 text-center text-white font-bold rounded-xl text-base flex items-center justify-center gap-2"
                    style={{ backgroundColor: '#E85D04' }}
                  >
                    🎤 AI音声で日報作成
                  </Link>
                )}
                <Link
                  href="/app/reports/new"
                  className="block w-full py-3 text-center text-gray-700 font-medium rounded-xl text-base border border-gray-300 bg-white hover:bg-gray-50"
                >
                  ＋ 手入力で日報作成
                </Link>
              </div>
            )}
          </div>
        )}

        {/* 未記入アラート */}
        {missingDates.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-bold text-yellow-800 mb-1">未記入の日があります（{missingDates.length}日）</p>
            <p className="text-xs text-yellow-700">{missingDates.join('・')}</p>
          </div>
        )}

        {/* 月ナビゲーション + サマリー */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <Link href={`/app/reports?month=${prevMonthParam}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              ‹ 前月
            </Link>
            <span className="font-bold text-gray-800">{monthLabel}</span>
            {!isCurrentMonth ? (
              <Link href={`/app/reports?month=${nextMonthParam}`} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                次月 ›
              </Link>
            ) : (
              <span className="w-16" />
            )}
          </div>
          <div className="grid grid-cols-3 divide-x divide-gray-100">
            <div className="px-3 py-3 text-center">
              <p className="text-xl font-bold" style={{ color: '#E85D04' }}>{reports.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">日報件数</p>
            </div>
            <div className="px-3 py-3 text-center">
              <p className="text-xl font-bold" style={{ color: '#2E7D32' }}>{submittedCount}</p>
              <p className="text-xs text-gray-500 mt-0.5">提出・承認済</p>
            </div>
            <div className="px-3 py-3 text-center">
              <p className="text-lg font-bold" style={{ color: '#455A64' }}>{totalWorkMin > 0 ? formatMinutes(totalWorkMin) : '-'}</p>
              <p className="text-xs text-gray-500 mt-0.5">総実働時間</p>
            </div>
          </div>
          {rejectedCount > 0 && (
            <div className="px-4 py-2 bg-red-50 border-t border-red-100">
              <p className="text-xs text-red-700 font-medium">差戻しが{rejectedCount}件あります。修正して再提出してください。</p>
            </div>
          )}
          {draftCount > 0 && (
            <div className="px-4 py-2 bg-orange-50 border-t border-orange-100">
              <p className="text-xs text-orange-700 font-medium">下書きが{draftCount}件あります。提出してください。</p>
            </div>
          )}
        </div>

        {/* 日報リスト */}
        <div>
          <div className="space-y-2">
            {reports.map((r) => {
              const workMin = r.endTime
                ? calcWorkingMinutes(new Date(r.startTime), new Date(r.endTime), r.breakMinutes)
                : null
              return (
                <div
                  key={r.id}
                  className={`flex items-center justify-between bg-white rounded-xl border shadow-sm px-4 py-3 transition-colors ${
                    r.status === 'REJECTED' ? 'border-red-200 bg-red-50' : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  <Link href={`/app/reports/${r.id}`} className="min-w-0 flex-1">
                    <p className="font-medium text-gray-800">
                      {new Date(r.reportDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">{r.site.name}</p>
                  </Link>
                  <div className="flex items-center gap-2 shrink-0">
                    {workMin && <span className="text-xs text-gray-400">{formatMinutes(workMin)}</span>}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REPORT_STATUS_COLOR[r.status]}`}>
                      {REPORT_STATUS_LABEL[r.status]}
                    </span>
                    {r.status === 'REJECTED' && (
                      <Link
                        href={`/app/reports/${r.id}/edit`}
                        className="text-xs px-2 py-1 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        修正する
                      </Link>
                    )}
                  </div>
                </div>
              )
            })}
            {reports.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
                {monthLabel}の日報はありません
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
