import { prisma } from '@/lib/db'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { updateCompanyStatus, updateCompanyInfo } from './actions'

const STATUS_MAP: Record<string, string> = { ACTIVE: '有効', SUSPENDED: '停止中', TRIAL: 'トライアル' }
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  TRIAL: 'bg-yellow-100 text-yellow-800',
}
const ROLE_MAP: Record<string, string> = {
  COMPANY_ADMIN: '管理者',
  WORKER: '作業員',
  SUPER_ADMIN: 'SU',
}
const SITE_STATUS_MAP: Record<string, string> = {
  PLANNING: '計画中',
  ACTIVE: '施工中',
  COMPLETED: '竣工済',
  SUSPENDED: '中断',
  ARCHIVED: 'アーカイブ',
}

export default async function CompanyDetailPage({
  params,
}: {
  params: { companyId: string }
}) {
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    include: {
      users: { orderBy: { createdAt: 'asc' } },
      sites: { where: { status: { not: 'ARCHIVED' } }, orderBy: { createdAt: 'desc' } },
    },
  })

  if (!company) notFound()

  const updateStatus = updateCompanyStatus.bind(null, company.id)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/admin/companies" className="text-gray-500 hover:text-gray-700 text-sm">
          ← 一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold text-gray-800">{company.name}</h1>
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[company.status]}`}>
          {STATUS_MAP[company.status]}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 会社情報編集 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-700 mb-4">会社情報</h2>
          <form action={updateCompanyInfo.bind(null, company.id)} className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">会社名</label>
              <input
                name="name"
                defaultValue={company.name}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">住所</label>
              <input
                name="address"
                defaultValue={company.address ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">電話番号</label>
              <input
                name="phone"
                defaultValue={company.phone ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">建設業許可番号</label>
              <input
                name="constructionLicense"
                defaultValue={company.constructionLicense ?? ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">プラン</label>
              <select
                name="plan"
                defaultValue={company.plan}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="FREE">無料</option>
                <option value="STANDARD">スタンダード</option>
                <option value="PREMIUM">プレミアム</option>
              </select>
            </div>
            <button
              type="submit"
              className="w-full py-2 text-white font-bold rounded-lg text-sm"
              style={{ backgroundColor: '#E85D04' }}
            >
              保存
            </button>
          </form>
        </div>

        {/* ステータス変更 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="font-bold text-gray-700 mb-4">ステータス変更</h2>
          <div className="space-y-2">
            <form action={updateStatus.bind(null, 'ACTIVE')}>
              <button
                type="submit"
                className="w-full py-2 bg-green-600 text-white font-medium rounded-lg text-sm hover:bg-green-700 transition-colors"
              >
                有効にする
              </button>
            </form>
            <form action={updateStatus.bind(null, 'TRIAL')}>
              <button
                type="submit"
                className="w-full py-2 bg-yellow-500 text-white font-medium rounded-lg text-sm hover:bg-yellow-600 transition-colors"
              >
                トライアルにする
              </button>
            </form>
            <form action={updateStatus.bind(null, 'SUSPENDED')}>
              <button
                type="submit"
                className="w-full py-2 bg-red-600 text-white font-medium rounded-lg text-sm hover:bg-red-700 transition-colors"
              >
                停止する
              </button>
            </form>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg text-xs text-gray-500 space-y-1">
            <p>登録日: {company.createdAt.toLocaleDateString('ja-JP')}</p>
            {company.planExpiresAt && (
              <p>プラン有効期限: {company.planExpiresAt.toLocaleDateString('ja-JP')}</p>
            )}
            {company.stripeCustomerId && (
              <p>Stripe顧客ID: {company.stripeCustomerId}</p>
            )}
          </div>
        </div>
      </div>

      {/* 従業員一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">従業員一覧 ({company.users.length}名)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">氏名</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">メールアドレス</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">権限</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">ステータス</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {company.users.map((u) => (
              <tr key={u.id}>
                <td className="px-5 py-3 font-medium text-gray-800">{u.name}</td>
                <td className="px-5 py-3 text-gray-600">{u.email}</td>
                <td className="px-5 py-3 text-gray-600">{ROLE_MAP[u.role] ?? u.role}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {u.isActive ? '有効' : '無効'}
                  </span>
                </td>
              </tr>
            ))}
            {company.users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">従業員が登録されていません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 現場一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">現場一覧 ({company.sites.length}件)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">現場名</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">発注者</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">ステータス</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">登録日</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {company.sites.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium text-gray-800">{s.name}</td>
                <td className="px-5 py-3 text-gray-600">{s.clientName ?? '-'}</td>
                <td className="px-5 py-3 text-gray-600">{SITE_STATUS_MAP[s.status] ?? s.status}</td>
                <td className="px-5 py-3 text-gray-500">{s.createdAt.toLocaleDateString('ja-JP')}</td>
              </tr>
            ))}
            {company.sites.length === 0 && (
              <tr>
                <td colSpan={4} className="px-5 py-8 text-center text-gray-400">現場が登録されていません</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
