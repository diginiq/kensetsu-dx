import { prisma } from '@/lib/db'
import Link from 'next/link'

const STATUS_MAP: Record<string, string> = { ACTIVE: '有効', SUSPENDED: '停止中', TRIAL: 'トライアル' }
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  TRIAL: 'bg-yellow-100 text-yellow-800',
}
const PLAN_MAP: Record<string, string> = { FREE: '無料', STANDARD: 'スタンダード', PREMIUM: 'プレミアム' }

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string }
}) {
  const { q, status } = searchParams

  const companies = await prisma.company.findMany({
    where: {
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      ...(status ? { status: status as 'ACTIVE' | 'SUSPENDED' | 'TRIAL' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      status: true,
      plan: true,
      createdAt: true,
      planExpiresAt: true,
      _count: { select: { users: true, sites: true } },
    },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">施工会社管理</h1>
        <Link
          href="/admin/companies/new"
          className="px-4 py-2 text-white rounded-lg text-sm font-bold"
          style={{ backgroundColor: '#E85D04' }}
        >
          + 新規登録
        </Link>
      </div>

      {/* 検索・フィルタ */}
      <form className="flex gap-3 flex-wrap">
        <input
          name="q"
          defaultValue={q}
          placeholder="会社名で検索"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary flex-1 min-w-48"
        />
        <select
          name="status"
          defaultValue={status ?? ''}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">すべてのステータス</option>
          <option value="TRIAL">トライアル</option>
          <option value="ACTIVE">有効</option>
          <option value="SUSPENDED">停止中</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium"
        >
          検索
        </button>
      </form>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">会社名</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">ステータス</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">プラン</th>
                <th className="text-right px-5 py-3 text-gray-500 font-medium">従業員</th>
                <th className="text-right px-5 py-3 text-gray-500 font-medium">現場</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">登録日</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-800">{c.name}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[c.status]}`}>
                      {STATUS_MAP[c.status]}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{PLAN_MAP[c.plan]}</td>
                  <td className="px-5 py-3 text-right text-gray-600">{c._count.users}名</td>
                  <td className="px-5 py-3 text-right text-gray-600">{c._count.sites}件</td>
                  <td className="px-5 py-3 text-gray-500">
                    {c.createdAt.toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/admin/companies/${c.id}`}
                      className="text-sm font-medium"
                      style={{ color: '#E85D04' }}
                    >
                      詳細
                    </Link>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                    会社が見つかりません
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
