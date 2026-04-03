import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { toggleWorkerStatus } from './actions'
import Link from 'next/link'
import { WorkerForm } from '@/components/features/workers/WorkerForm'

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

      <WorkerForm />

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
                  ワーカーが登録されていません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
