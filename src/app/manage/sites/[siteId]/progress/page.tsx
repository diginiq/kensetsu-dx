import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { calcWorkingMinutes } from '@/lib/reportUtils'
import { MilestoneManager } from './MilestoneManager'
import { SharedAlbumManager } from './SharedAlbumManager'

const SITE_STATUS_LABEL: Record<string, string> = {
  PLANNING: '計画中', ACTIVE: '施工中', COMPLETED: '竣工済', SUSPENDED: '中断', ARCHIVED: 'アーカイブ',
}

export default async function SiteProgressPage({
  params,
}: {
  params: { siteId: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    include: { assignments: { include: { user: { select: { id: true, name: true } } } } },
  })
  if (!site) redirect('/manage/sites')

  const now = new Date()
  const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const last90 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)

  const [reports, photoCount, hazardReports, recentPhotos, milestones, sharedAlbums] = await Promise.all([
    prisma.dailyReport.findMany({
      where: { siteId: params.siteId, status: { in: ['SUBMITTED', 'APPROVED'] } },
      select: {
        id: true, reportDate: true, startTime: true, endTime: true,
        breakMinutes: true, status: true, userId: true,
      },
      orderBy: { reportDate: 'asc' },
    }),
    prisma.photo.count({ where: { siteId: params.siteId } }),
    prisma.hazardReport.findMany({
      where: { siteId: params.siteId },
      select: { id: true, type: true, severity: true, status: true, occurredAt: true },
      orderBy: { occurredAt: 'desc' },
      take: 10,
    }),
    // 直近30日の日別写真数
    prisma.photo.findMany({
      where: { siteId: params.siteId, createdAt: { gte: last30 } },
      select: { createdAt: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.siteMilestone.findMany({
      where: { siteId: params.siteId },
      orderBy: [{ sortOrder: 'asc' }, { plannedDate: 'asc' }],
    }),
    prisma.sharedAlbum.findMany({
      where: { siteId: params.siteId, isActive: true },
      select: { id: true, title: true, token: true, expiresAt: true },
    }),
  ])

  const totalWorkMin = reports.reduce((s, r) =>
    r.endTime ? s + calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes) : s, 0)
  const approvedCount = reports.filter(r => r.status === 'APPROVED').length
  const approvalRate = reports.length > 0 ? Math.round((approvedCount / reports.length) * 100) : 0
  const workerSet = new Set(reports.map(r => r.userId))

  // 工期進捗
  const startDate = site.startDate
  const endDate = site.endDate
  let progressPct = 0
  let daysRemaining: number | null = null
  let daysElapsed: number | null = null
  if (startDate && endDate) {
    const total = endDate.getTime() - startDate.getTime()
    const elapsed = Math.max(0, now.getTime() - startDate.getTime())
    progressPct = Math.min(100, Math.round((elapsed / total) * 100))
    daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - now.getTime()) / 86400000))
    daysElapsed = Math.floor(elapsed / 86400000)
  }

  // 週別日報件数（直近12週）
  const weeklyData: { week: string; count: number; workMin: number }[] = []
  for (let w = 11; w >= 0; w--) {
    const weekStart = new Date(now.getTime() - (w + 1) * 7 * 24 * 60 * 60 * 1000)
    const weekEnd = new Date(now.getTime() - w * 7 * 24 * 60 * 60 * 1000)
    const weekReports = reports.filter(r => {
      const d = new Date(r.reportDate)
      return d >= weekStart && d < weekEnd
    })
    weeklyData.push({
      week: weekStart.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }),
      count: weekReports.length,
      workMin: weekReports.reduce((s, r) =>
        r.endTime ? s + calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes) : s, 0),
    })
  }
  const maxWeekCount = Math.max(...weeklyData.map(w => w.count), 1)

  // 日別写真数（直近30日）
  const photoDayMap: Record<string, number> = {}
  recentPhotos.forEach(p => {
    const key = p.createdAt.toISOString().split('T')[0]
    photoDayMap[key] = (photoDayMap[key] ?? 0) + 1
  })
  const photoMaxDay = Math.max(...Object.values(photoDayMap), 1)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/manage/sites" className="text-sm text-gray-500 hover:text-gray-700">← 現場管理</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-2xl font-bold text-gray-800">{site.name}</h1>
        <span className="text-sm px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
          {SITE_STATUS_LABEL[site.status] ?? site.status}
        </span>
      </div>

      {/* PDF出力ボタン */}
      <div className="flex flex-wrap gap-2">
        <a href={`/api/sites/${site.id}/work-diary?year=${now.getFullYear()}&month=${now.getMonth() + 1}`}
          target="_blank"
          className="px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
          工事日誌PDF
        </a>
        <a href={`/api/sites/${site.id}/worker-roster`}
          target="_blank"
          className="px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
          作業員名簿PDF
        </a>
        <a href={`/api/sites/${site.id}/photobook`}
          target="_blank"
          className="px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
          写真帳PDF
        </a>
        <a href={`/api/sites/${site.id}/photos/zip`}
          className="px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50">
          写真ZIP
        </a>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '日報件数', value: `${reports.length}件`, color: '#E85D04' },
          { label: '総実働時間', value: `${Math.floor(totalWorkMin / 60)}h`, color: '#455A64' },
          { label: '写真枚数', value: `${photoCount}枚`, color: '#1565C0' },
          { label: '承認率', value: `${approvalRate}%`, color: '#2E7D32' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500">{label}</p>
            <p className="text-2xl font-bold mt-1" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* 工期進捗 */}
      {startDate && endDate && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-3">工期進捗</h2>
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>{startDate.toLocaleDateString('ja-JP')}</span>
            <span className="font-bold" style={{ color: daysRemaining === 0 ? '#C62828' : daysRemaining !== null && daysRemaining < 30 ? '#E85D04' : '#2E7D32' }}>
              {daysRemaining !== null
                ? daysRemaining === 0 ? '本日期限' : `残 ${daysRemaining}日`
                : ''}
            </span>
            <span>{endDate.toLocaleDateString('ja-JP')}</span>
          </div>
          <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all"
              style={{ width: `${progressPct}%`, backgroundColor: progressPct >= 90 ? '#C62828' : '#E85D04' }} />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">経過 {progressPct}%（{daysElapsed}日経過）</p>
        </div>
      )}

      {/* 週別日報棒グラフ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-700 mb-4">週別 日報件数（直近12週）</h2>
        <div className="flex items-end gap-1 h-24">
          {weeklyData.map((w, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${w.week}: ${w.count}件`}>
              <div className="w-full rounded-t transition-all"
                style={{
                  height: `${Math.round((w.count / maxWeekCount) * 100)}%`,
                  minHeight: w.count > 0 ? '4px' : '0',
                  backgroundColor: w.count > 0 ? '#E85D04' : 'transparent',
                }} />
              <span className="text-[9px] text-gray-400 rotate-0">{i % 3 === 0 ? w.week.replace('月', '/') : ''}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 日別写真数グラフ */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-700 mb-4">日別 写真投稿数（直近30日）</h2>
        <div className="flex items-end gap-0.5 h-20">
          {Array.from({ length: 30 }, (_, i) => {
            const d = new Date(now.getTime() - (29 - i) * 86400000)
            const key = d.toISOString().split('T')[0]
            const count = photoDayMap[key] ?? 0
            return (
              <div key={i} className="flex-1" title={`${d.getMonth() + 1}/${d.getDate()}: ${count}枚`}
                style={{
                  height: `${Math.round((count / photoMaxDay) * 100)}%`,
                  minHeight: count > 0 ? '4px' : '0',
                  backgroundColor: count > 0 ? '#1565C0' : 'transparent',
                  borderRadius: '2px 2px 0 0',
                }} />
            )
          })}
        </div>
      </div>

      {/* 担当ワーカー */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-700 mb-3">担当ワーカー ({site.assignments.length}名)</h2>
        <div className="flex flex-wrap gap-2">
          {site.assignments.map((a) => (
            <Link key={a.userId}
              href={`/manage/workers/${a.userId}/profile`}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                workerSet.has(a.userId)
                  ? 'bg-orange-50 border-orange-200 text-orange-800 hover:bg-orange-100'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}>
              {a.user.name}
              {workerSet.has(a.userId) && <span className="ml-1 text-xs">✓</span>}
            </Link>
          ))}
          {site.assignments.length === 0 && (
            <p className="text-sm text-gray-400">担当者が割り当てられていません</p>
          )}
        </div>
      </div>

      {/* 工程マイルストーン */}
      <MilestoneManager
        siteId={site.id}
        milestones={milestones.map((m) => ({
          id: m.id,
          title: m.title,
          plannedDate: m.plannedDate.toISOString(),
          completedAt: m.completedAt?.toISOString() ?? null,
          sortOrder: m.sortOrder,
        }))}
      />

      {/* 共有アルバム */}
      <SharedAlbumManager
        siteId={site.id}
        albums={sharedAlbums.map((a) => ({
          id: a.id,
          title: a.title,
          token: a.token,
          expiresAt: a.expiresAt?.toISOString() ?? null,
        }))}
      />

      {/* ヒヤリハット */}
      {hazardReports.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-700">ヒヤリハット・事故報告</h2>
            <Link href={`/manage/hazard?siteId=${site.id}`}
              className="text-xs text-orange-600 hover:underline">一覧を見る</Link>
          </div>
          <div className="space-y-2">
            {hazardReports.slice(0, 5).map((h) => {
              const SEVERITY_COLOR: Record<string, string> = { HIGH: 'text-red-600', MEDIUM: 'text-yellow-600', LOW: 'text-green-600' }
              const TYPE_LABEL: Record<string, string> = { NEAR_MISS: 'ヒヤリハット', ACCIDENT: '事故', UNSAFE_CONDITION: '危険箇所' }
              return (
                <div key={h.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{new Date(h.occurredAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}　{TYPE_LABEL[h.type] ?? h.type}</span>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-xs ${SEVERITY_COLOR[h.severity] ?? ''}`}>
                      {h.severity === 'HIGH' ? '重大' : h.severity === 'MEDIUM' ? '中程度' : '軽微'}
                    </span>
                    <span className={`text-xs ${h.status === 'OPEN' ? 'text-orange-600' : 'text-gray-400'}`}>
                      {h.status === 'OPEN' ? '未対応' : '対応済'}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
