import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function AdminDashboardPage() {
  const [companyCount, userCount, siteCount, recentCompanies, statusCounts, safetyDocCount, safetyDocStatusCounts] = await Promise.all([
    prisma.company.count(),
    prisma.user.count({ where: { role: { not: 'SUPER_ADMIN' } } }),
    prisma.site.count(),
    prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        status: true,
        plan: true,
        createdAt: true,
        _count: { select: { users: true, sites: true } },
      },
    }),
    prisma.company.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
    prisma.safetyDocument.count(),
    prisma.safetyDocument.groupBy({
      by: ['status'],
      _count: { _all: true },
    }),
  ])

  const statusMap: Record<string, string> = {
    ACTIVE: '有効',
    SUSPENDED: '停止中',
    TRIAL: 'トライアル',
  }

  const statusColors: Record<string, string> = {
    ACTIVE: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-red-100 text-red-800',
    TRIAL: 'bg-yellow-100 text-yellow-800',
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">施工会社数</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#E85D04' }}>{companyCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">ユーザー数</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#455A64' }}>{userCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">現場数</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#2E7D32' }}>{siteCount}</p>
        </div>
      </div>

      {/* ステータス別内訳 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
        <h2 className="font-bold text-gray-700 mb-3">課金ステータス別</h2>
        <div className="flex gap-3 flex-wrap">
          {statusCounts.map((s) => (
            <span
              key={s.status}
              className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[s.status] ?? 'bg-gray-100 text-gray-700'}`}
            >
              {statusMap[s.status] ?? s.status}: {s._count._all}社
            </span>
          ))}
        </div>
      </div>

      {/* 安全書類統計 */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
        <h2 className="font-bold text-gray-700 mb-3">安全書類（グリーンファイル）</h2>
        <div className="flex items-center gap-6">
          <div>
            <p className="text-sm text-gray-500">総書類数</p>
            <p className="text-2xl font-bold" style={{ color: '#455A64' }}>{safetyDocCount}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {safetyDocStatusCounts.map((s) => {
              const docStatusMap: Record<string, string> = {
                DRAFT: '下書き',
                SUBMITTED: '提出済み',
                ACCEPTED: '受理',
                REJECTED: '差戻し',
              }
              const docStatusColors: Record<string, string> = {
                DRAFT: 'bg-gray-100 text-gray-700',
                SUBMITTED: 'bg-blue-100 text-blue-800',
                ACCEPTED: 'bg-green-100 text-green-800',
                REJECTED: 'bg-red-100 text-red-800',
              }
              return (
                <span
                  key={s.status}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${docStatusColors[s.status] ?? 'bg-gray-100 text-gray-700'}`}
                >
                  {docStatusMap[s.status] ?? s.status}: {s._count._all}件
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {/* 最近登録された会社 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">最近登録された会社</h2>
          <Link href="/admin/companies" className="text-sm font-medium" style={{ color: '#E85D04' }}>
            すべて表示 →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">会社名</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">ステータス</th>
                <th className="text-right px-5 py-3 text-gray-500 font-medium">従業員</th>
                <th className="text-right px-5 py-3 text-gray-500 font-medium">現場</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">登録日</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {recentCompanies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3">
                    <Link
                      href={`/admin/companies/${c.id}`}
                      className="font-medium text-gray-800 hover:underline"
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[c.status] ?? 'bg-gray-100'}`}>
                      {statusMap[c.status] ?? c.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-600">{c._count.users}名</td>
                  <td className="px-5 py-3 text-right text-gray-600">{c._count.sites}件</td>
                  <td className="px-5 py-3 text-gray-500">
                    {c.createdAt.toLocaleDateString('ja-JP')}
                  </td>
                </tr>
              ))}
              {recentCompanies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                    登録された会社はありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
