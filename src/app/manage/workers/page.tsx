import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { createWorker, toggleWorkerStatus } from './actions'
import Link from 'next/link'

export default async function ManageWorkersPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const workers = await prisma.user.findMany({
    where: { companyId: session.user.companyId, role: 'WORKER' },
    orderBy: { createdAt: 'asc' },
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">従業員管理</h1>

      {/* 新規登録フォーム */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-bold text-gray-700 mb-4">新規従業員登録</h2>
        <form action={createWorker} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">氏名 *</label>
            <input
              name="name"
              required
              placeholder="山田 太郎"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">メールアドレス *</label>
            <input
              name="email"
              type="email"
              required
              placeholder="worker@example.co.jp"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">電話番号</label>
            <input
              name="phone"
              placeholder="090-0000-0000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">パスワード *</label>
            <input
              name="password"
              type="password"
              required
              placeholder="8文字以上"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="px-6 py-2 text-white font-bold rounded-lg text-sm"
              style={{ backgroundColor: '#E85D04' }}
            >
              登録する
            </button>
          </div>
        </form>
      </div>

      {/* 従業員一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">従業員一覧 ({workers.length}名)</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">氏名</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">メールアドレス</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">電話番号</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">ステータス</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {workers.map((w) => (
              <tr key={w.id} className={w.isActive ? '' : 'opacity-50'}>
                <td className="px-5 py-3 font-medium text-gray-800">{w.name}</td>
                <td className="px-5 py-3 text-gray-600">{w.email}</td>
                <td className="px-5 py-3 text-gray-600">{w.phone ?? '-'}</td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {w.isActive ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right flex gap-2 justify-end">
                  <Link
                    href={`/manage/workers/${w.id}/profile`}
                    className="text-xs px-3 py-1 rounded font-medium bg-blue-50 text-blue-700 hover:bg-blue-100"
                  >
                    プロフィール
                  </Link>
                  <form action={toggleWorkerStatus.bind(null, w.id, !w.isActive)}>
                    <button
                      type="submit"
                      className={`text-xs px-3 py-1 rounded font-medium ${w.isActive ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}
                    >
                      {w.isActive ? '無効にする' : '有効にする'}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
            {workers.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-gray-400">
                  作業員が登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
