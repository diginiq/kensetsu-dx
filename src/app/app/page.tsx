import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { Settings, ClipboardList, Clock, AlertCircle, Megaphone, Pin, ShieldAlert, Shield, CalendarOff, CalendarDays, Award } from 'lucide-react'
import { fetchWeather } from '@/lib/weather'
import { WeatherCard } from '@/components/features/weather/WeatherCard'

const SITE_STATUS_LABEL: Record<string, string> = {
  PLANNING: '計画中',
  ACTIVE: '施工中',
  COMPLETED: '竣工済',
  SUSPENDED: '中断',
}
const SITE_STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
}

export default async function AppPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const company = session.user.companyId
    ? await prisma.company.findUnique({ where: { id: session.user.companyId }, select: { name: true } })
    : null

  // COMPANY_ADMINの場合は全現場を表示、WORKERは割り当て済み現場のみ
  let sites: { id: string; name: string; clientName: string | null; status: string; latitude: number | null; longitude: number | null; _count: { photos: number } }[]

  if (session.user.role === 'COMPANY_ADMIN' && session.user.companyId) {
    sites = await prisma.site.findMany({
      where: {
        companyId: session.user.companyId,
        status: { not: 'ARCHIVED' },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        clientName: true,
        status: true,
        latitude: true,
        longitude: true,
        _count: { select: { photos: true } },
      },
    })
  } else {
    // WORKERは割り当てられた現場のみ
    const assignments = await prisma.siteAssignment.findMany({
      where: { userId: session.user.id },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            clientName: true,
            status: true,
            latitude: true,
            longitude: true,
            _count: { select: { photos: true } },
          },
        },
      },
    })
    sites = assignments
      .filter((a) => a.site.status !== 'ARCHIVED')
      .map((a) => a.site)
  }

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  const siteIds = sites.map((s) => s.id)

  const [todayReports, draftReports, todayClockIn, announcements] = await Promise.all([
    // 今日の日報（このワーカーの全担当現場）
    prisma.dailyReport.findMany({
      where: {
        userId: session.user.id,
        siteId: { in: siteIds },
        reportDate: { gte: todayStart, lte: todayEnd },
      },
      select: { id: true, siteId: true, status: true },
    }),
    // 未提出の下書き日報（過去7日以内）
    prisma.dailyReport.findMany({
      where: {
        userId: session.user.id,
        status: 'DRAFT',
        reportDate: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      select: { id: true, siteId: true, reportDate: true },
      orderBy: { reportDate: 'desc' },
    }),
    // 今日の出勤記録（最新）
    prisma.timeEntry.findFirst({
      where: {
        userId: session.user.id,
        timestamp: { gte: todayStart },
        type: 'CLOCK_IN',
      },
      orderBy: { timestamp: 'desc' },
      select: { id: true, siteId: true, timestamp: true },
    }),
    // 担当現場のお知らせ（直近7日分、ピン留め優先）
    siteIds.length > 0 ? prisma.siteAnnouncement.findMany({
      where: {
        siteId: { in: siteIds },
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
      include: { site: { select: { name: true } } },
      orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
      take: 10,
    }) : Promise.resolve([]),
  ])

  // 天気予報（座標のある最初のアクティブ現場）
  const siteWithCoords = sites.find((s) => s.latitude && s.longitude && s.status === 'ACTIVE')
  const weatherDays = siteWithCoords?.latitude && siteWithCoords?.longitude
    ? await fetchWeather(siteWithCoords.latitude, siteWithCoords.longitude)
    : null

  const todayReportBySite = Object.fromEntries(todayReports.map((r) => [r.siteId, r.status]))

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="KSDX" width={32} height={32} className="rounded" />
            <div>
              <p className="text-xs text-white/70 leading-none">{company?.name ?? '建設DX'}</p>
              <p className="font-bold text-sm leading-tight">{session.user.name}</p>
            </div>
          </div>
          <Link href="/app/settings" className="text-white/70 hover:text-white p-2">
            <Settings size={20} />
          </Link>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-screen-sm mx-auto w-full px-4 py-5 space-y-4">

        {/* クイックアクション */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/app/timeclock"
            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-orange-300 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">出勤打刻</span>
            </div>
            {todayClockIn ? (
              <p className="text-sm font-bold text-green-700">
                出勤中
                <span className="block text-xs font-normal text-gray-400 mt-0.5">
                  {new Date(todayClockIn.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 〜
                </span>
              </p>
            ) : (
              <p className="text-sm font-medium" style={{ color: '#E85D04' }}>タップして打刻</p>
            )}
          </Link>

          <Link
            href="/app/hazard/new"
            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-red-300 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span className="text-xs text-gray-500">ヒヤリハット</span>
            </div>
            <p className="text-sm font-medium text-red-600">報告する</p>
          </Link>

          <Link
            href={todayReports.length > 0 ? `/app/reports/${todayReports[0].id}` : '/app/reports/new'}
            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-orange-300 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <ClipboardList className="w-4 h-4 text-gray-400" />
              <span className="text-xs text-gray-500">今日の日報</span>
            </div>
            {todayReports.length > 0 ? (
              <p className="text-sm font-bold" style={{
                color: todayReports.some(r => r.status === 'APPROVED') ? '#2E7D32'
                  : todayReports.some(r => r.status === 'SUBMITTED') ? '#1565C0'
                  : '#E85D04'
              }}>
                {todayReports.some(r => r.status === 'APPROVED') ? '承認済み'
                  : todayReports.some(r => r.status === 'SUBMITTED') ? '提出済み'
                  : '下書き（編集する）'}
              </p>
            ) : (
              <p className="text-sm font-medium" style={{ color: '#E85D04' }}>タップして記入</p>
            )}
          </Link>

          <Link
            href="/app/ky"
            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-green-300 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">KY活動</span>
            </div>
            <p className="text-sm font-medium text-green-700">危険予知チェック</p>
          </Link>

          <Link
            href="/app/leave"
            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-blue-300 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <CalendarOff className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-gray-500">休暇申請</span>
            </div>
            <p className="text-sm font-medium text-blue-600">有給・遅刻など</p>
          </Link>

          <Link
            href="/app/work-plans"
            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-purple-300 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays className="w-4 h-4 text-purple-400" />
              <span className="text-xs text-gray-500">作業計画</span>
            </div>
            <p className="text-sm font-medium text-purple-600">週次スケジュール</p>
          </Link>

          <Link
            href="/app/qualifications"
            className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-yellow-300 transition-colors"
          >
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-yellow-500" />
              <span className="text-xs text-gray-500">資格・免許</span>
            </div>
            <p className="text-sm font-medium text-yellow-700">保有資格を確認</p>
          </Link>
        </div>

        {/* 下書き日報アラート */}
        {draftReports.length > 0 && (
          <Link
            href="/app/reports"
            className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 hover:bg-amber-100 transition-colors"
          >
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-700">未提出の日報が{draftReports.length}件あります</p>
              <p className="text-xs text-amber-600 mt-0.5">
                {draftReports.map(r => new Date(r.reportDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })).join('、')} → タップして確認
              </p>
            </div>
          </Link>
        )}

        {/* 天気予報 */}
        {weatherDays && siteWithCoords && (
          <WeatherCard siteName={siteWithCoords.name} days={weatherDays} />
        )}

        {/* 現場お知らせ */}
        {announcements.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">お知らせ</h2>
            <div className="space-y-2">
              {announcements.map((ann) => (
                <div
                  key={ann.id}
                  className={`rounded-xl px-4 py-3 border ${ann.pinned ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}
                >
                  <div className="flex items-start gap-2">
                    {ann.pinned
                      ? <Pin size={14} className="text-orange-500 shrink-0 mt-0.5" />
                      : <Megaphone size={14} className="text-gray-400 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${ann.pinned ? 'text-orange-800' : 'text-gray-800'}`}>{ann.title}</p>
                      <p className={`text-xs mt-0.5 whitespace-pre-line ${ann.pinned ? 'text-orange-700' : 'text-gray-600'}`}>{ann.body}</p>
                      <p className="text-xs text-gray-400 mt-1">{ann.site.name} ・ {new Date(ann.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 担当現場一覧 */}
        <div>
          <h1 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">担当現場</h1>

          {sites.length === 0 ? (
            <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
              <p className="text-gray-400">割り当てられた現場がありません</p>
              <p className="text-xs text-gray-400 mt-1">マネージャーに現場の割り当てを依頼してください</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sites.map((site) => {
                const reportStatus = todayReportBySite[site.id]
                return (
                  <Link
                    key={site.id}
                    href={`/dashboard/sites/${site.id}`}
                    className="block bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-orange-300 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 truncate">{site.name}</p>
                        {site.clientName && (
                          <p className="text-sm text-gray-500 mt-0.5">{site.clientName}</p>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${SITE_STATUS_COLORS[site.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {SITE_STATUS_LABEL[site.status] ?? site.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">写真 {site._count.photos}枚</span>
                        {reportStatus && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            reportStatus === 'APPROVED' ? 'bg-green-100 text-green-700' :
                            reportStatus === 'SUBMITTED' ? 'bg-blue-100 text-blue-700' :
                            'bg-orange-100 text-orange-700'
                          }`}>
                            今日: {reportStatus === 'APPROVED' ? '承認済' : reportStatus === 'SUBMITTED' ? '提出済' : '下書き'}
                          </span>
                        )}
                      </div>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
