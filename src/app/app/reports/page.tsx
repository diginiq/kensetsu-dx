import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { LogoutButton } from '@/components/features/auth/LogoutButton'
import { REPORT_STATUS_LABEL, REPORT_STATUS_COLOR } from '@/lib/reportUtils'

export default async function AppReportsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  const reports = await prisma.dailyReport.findMany({
    where: {
      userId: session.user.id,
      reportDate: { gte: sevenDaysAgo },
    },
    include: { site: { select: { name: true } } },
    orderBy: { reportDate: 'desc' },
  })

  const todayReport = reports.find((r) => {
    const d = new Date(r.reportDate)
    d.setHours(0, 0, 0, 0)
    return d.getTime() === today.getTime()
  })

  // 過去7日で日報のない日を検出
  const reportedDates = new Set(reports.map((r) => {
    const d = new Date(r.reportDate)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }))
  const missingDates: string[] = []
  for (let i = 1; i <= 6; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    // 土日は除外
    if (d.getDay() !== 0 && d.getDay() !== 6 && !reportedDates.has(d.getTime())) {
      missingDates.push(d.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' }))
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="KSDX" width={32} height={32} className="rounded" />
            <div>
              <p className="text-xs text-white/70 leading-none">建設DX</p>
              <p className="font-bold text-sm leading-tight">日報</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app" className="text-xs text-white/80 hover:text-white px-2 py-1">← 現場</Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-5 space-y-4">
        {/* 今日の日報ステータス */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-gray-800">今日の日報</p>
            <p className="text-xs text-gray-400">{new Date().toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}</p>
          </div>
          {todayReport ? (
            <div className="flex items-center justify-between">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${REPORT_STATUS_COLOR[todayReport.status]}`}>
                {REPORT_STATUS_LABEL[todayReport.status]}
              </span>
              <Link
                href={`/app/reports/${todayReport.id}`}
                className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                確認・編集
              </Link>
            </div>
          ) : (
            <Link
              href="/app/reports/new"
              className="block w-full py-3 text-center text-white font-bold rounded-xl text-base"
              style={{ backgroundColor: '#E85D04' }}
            >
              ＋ 今日の日報を作成
            </Link>
          )}
        </div>

        {/* 未提出アラート */}
        {missingDates.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <p className="text-sm font-bold text-yellow-800 mb-1">未提出の日報があります</p>
            <p className="text-xs text-yellow-700">{missingDates.join('・')}</p>
          </div>
        )}

        {/* 打刻リンク */}
        <Link
          href="/app/timeclock"
          className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-orange-300 transition-colors"
        >
          <div>
            <p className="font-bold text-gray-800">出退勤打刻</p>
            <p className="text-xs text-gray-500 mt-0.5">GPS付きタイムスタンプ</p>
          </div>
          <span className="text-2xl">🕐</span>
        </Link>

        {/* 過去7日間の日報 */}
        <div>
          <h2 className="text-sm font-bold text-gray-600 mb-2">過去7日間</h2>
          <div className="space-y-2">
            {reports.map((r) => (
              <Link
                key={r.id}
                href={`/app/reports/${r.id}`}
                className="flex items-center justify-between bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-orange-300 transition-colors"
              >
                <div>
                  <p className="font-medium text-gray-800">
                    {new Date(r.reportDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{r.site.name}</p>
                </div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REPORT_STATUS_COLOR[r.status]}`}>
                  {REPORT_STATUS_LABEL[r.status]}
                </span>
              </Link>
            ))}
            {reports.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-400 text-sm">
                日報がありません
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
