import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { detectNewEntries } from '@/lib/safety/alerts'

const DOC_TYPE_LABELS: Record<string, string> = {
  SUBCONTRACT_NOTIFICATION: '再下請負通知書',
  WORKER_ROSTER: '作業員名簿',
  CONSTRUCTION_SYSTEM: '施工体制台帳',
  SAFETY_PLAN: '安全衛生計画書',
  NEW_ENTRY_SURVEY: '新規入場者調査票',
  SAFETY_MEETING: '安全ミーティング報告書',
  FIRE_USE_PERMIT: '火気使用願',
  EQUIPMENT_ENTRY: '持込機械届',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '下書き',
  SUBMITTED: '提出済み',
  ACCEPTED: '受理',
  REJECTED: '差戻し',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

export default async function SafetyDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const companyId = session.user.companyId
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const [sites, recentDocs, expiringQuals, expiredQuals, newEntryAlerts] = await Promise.all([
    prisma.site.findMany({
      where: { companyId, status: { in: ['ACTIVE', 'PLANNING'] } },
      select: {
        id: true,
        name: true,
        status: true,
        safetyDocuments: {
          select: { id: true, documentType: true, status: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.safetyDocument.findMany({
      where: { companyId },
      include: { site: { select: { name: true } } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    }),
    prisma.workerQualification.findMany({
      where: {
        user: { companyId },
        expiresDate: { gt: now, lte: thirtyDaysLater },
      },
      include: { user: { select: { name: true } } },
      orderBy: { expiresDate: 'asc' },
    }),
    prisma.workerQualification.findMany({
      where: {
        user: { companyId },
        expiresDate: { lt: now },
      },
      include: { user: { select: { name: true } } },
      orderBy: { expiresDate: 'asc' },
    }),
    detectNewEntries(companyId),
  ])

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">安全書類管理</h1>

      {/* 新規入場者アラート */}
      {newEntryAlerts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-bold text-blue-800 mb-2">新規入場者 要対応 ({newEntryAlerts.length}件)</h3>
          <p className="text-xs text-blue-600 mb-2">以下の作業員が初めて現場に出勤しました。新規入場者調査票の作成をお勧めします。</p>
          <div className="space-y-1">
            {newEntryAlerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-blue-700">
                  <span className="font-medium">{alert.userName}</span> → {alert.siteName}
                </span>
                <Link
                  href={`/manage/safety/sites/${alert.siteId}/new`}
                  className="text-xs px-3 py-1 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 font-medium"
                >
                  調査票を作成
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 資格期限アラート */}
      {(expiredQuals.length > 0 || expiringQuals.length > 0) && (
        <div className="space-y-3">
          {expiredQuals.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h3 className="font-bold text-red-800 mb-2">期限切れ資格 ({expiredQuals.length}件)</h3>
              <div className="space-y-1">
                {expiredQuals.map((q) => (
                  <div key={q.id} className="flex items-center justify-between text-sm">
                    <span className="text-red-700">
                      <span className="font-medium">{q.user.name}</span> - {q.name}
                    </span>
                    <span className="text-red-600 font-medium">
                      {q.expiresDate?.toLocaleDateString('ja-JP')} 期限切れ
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {expiringQuals.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h3 className="font-bold text-yellow-800 mb-2">30日以内に期限切れ ({expiringQuals.length}件)</h3>
              <div className="space-y-1">
                {expiringQuals.map((q) => (
                  <div key={q.id} className="flex items-center justify-between text-sm">
                    <span className="text-yellow-700">
                      <span className="font-medium">{q.user.name}</span> - {q.name}
                    </span>
                    <span className="text-yellow-600 font-medium">
                      {q.expiresDate?.toLocaleDateString('ja-JP')} まで
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 現場別書類提出状況 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-bold text-gray-700 mb-4">現場別 書類提出状況</h2>
        {sites.length === 0 ? (
          <p className="text-gray-400 text-sm">アクティブな現場がありません</p>
        ) : (
          <div className="space-y-4">
            {sites.map((site) => {
              const total = site.safetyDocuments.length
              const submitted = site.safetyDocuments.filter(
                (d) => d.status === 'SUBMITTED' || d.status === 'ACCEPTED'
              ).length
              const pct = total > 0 ? Math.round((submitted / total) * 100) : 0
              return (
                <div key={site.id}>
                  <div className="flex items-center justify-between mb-1">
                    <Link
                      href={`/manage/safety/sites/${site.id}`}
                      className="text-sm font-medium text-gray-800 hover:underline"
                    >
                      {site.name}
                    </Link>
                    <span className="text-xs text-gray-500">
                      {submitted}/{total}件 ({pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: pct === 100 ? '#2E7D32' : '#E85D04',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 最近の書類 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">最近の安全書類</h2>
        </div>
        {recentDocs.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400">
            安全書類がまだ作成されていません
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">書類名</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">種別</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">現場</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">ステータス</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">更新日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/manage/safety/sites/${doc.siteId}`}
                      className="font-medium text-gray-800 hover:underline"
                    >
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-gray-600">
                    {DOC_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{doc.site.name}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status]}`}>
                      {STATUS_LABELS[doc.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500">
                    {doc.updatedAt.toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
