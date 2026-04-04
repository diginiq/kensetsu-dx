import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function WorkerQualificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const qualifications = await prisma.workerQualification.findMany({
    where: { userId: session.user.id },
    orderBy: [{ expiresDate: 'asc' }, { createdAt: 'desc' }],
  })

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  const in90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

  function getStatus(expiresDate: Date | null) {
    if (!expiresDate) return 'none'
    if (expiresDate < now) return 'expired'
    if (expiresDate <= in30Days) return 'danger'
    if (expiresDate <= in90Days) return 'warning'
    return 'valid'
  }

  const statusStyle = {
    expired: 'bg-red-50 border-red-200',
    danger: 'bg-orange-50 border-orange-200',
    warning: 'bg-yellow-50 border-yellow-200',
    valid: 'bg-white border-gray-200',
    none: 'bg-white border-gray-200',
  }

  const badgeStyle = {
    expired: 'bg-red-100 text-red-700',
    danger: 'bg-orange-100 text-orange-700',
    warning: 'bg-yellow-100 text-yellow-700',
    valid: 'bg-green-100 text-green-700',
    none: 'bg-gray-100 text-gray-600',
  }

  const badgeLabel = {
    expired: '期限切れ',
    danger: '30日以内',
    warning: '要注意',
    valid: '有効',
    none: '期限なし',
  }

  const expired = qualifications.filter((q) => getStatus(q.expiresDate) === 'expired')
  const expiring = qualifications.filter((q) => ['danger', 'warning'].includes(getStatus(q.expiresDate)))
  const valid = qualifications.filter((q) => ['valid', 'none'].includes(getStatus(q.expiresDate)))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link href="/app/settings" className="text-white/70 hover:text-white">
            ←
          </Link>
          <p className="font-bold">保有資格・免許</p>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-5 space-y-5">
        {/* サマリー */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-gray-800">{qualifications.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">合計</p>
          </div>
          <div className={`rounded-xl border p-3 text-center shadow-sm ${expired.length > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
            <p className={`text-2xl font-bold ${expired.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{expired.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">期限切れ</p>
          </div>
          <div className={`rounded-xl border p-3 text-center shadow-sm ${expiring.length > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
            <p className={`text-2xl font-bold ${expiring.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>{expiring.length}</p>
            <p className="text-xs text-gray-500 mt-0.5">要更新</p>
          </div>
        </div>

        {qualifications.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center shadow-sm">
            <p className="text-gray-400">資格情報が登録されていません</p>
            <p className="text-xs text-gray-400 mt-1">管理者に依頼して資格情報を登録してもらいましょう</p>
          </div>
        ) : (
          <div className="space-y-2">
            {qualifications.map((q) => {
              const status = getStatus(q.expiresDate)
              const daysLeft = q.expiresDate
                ? Math.ceil((q.expiresDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null

              return (
                <div key={q.id} className={`rounded-xl border p-4 shadow-sm ${statusStyle[status]}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-800">{q.name}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeStyle[status]}`}>
                          {badgeLabel[status]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">{q.category}</p>
                      {q.certNumber && (
                        <p className="text-xs text-gray-500 mt-0.5">証番号: {q.certNumber}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      {q.expiresDate ? (
                        <>
                          <p className="text-sm font-medium text-gray-700">
                            {q.expiresDate.toLocaleDateString('ja-JP')}
                          </p>
                          <p className={`text-xs mt-0.5 font-medium ${
                            status === 'expired' ? 'text-red-600' :
                            status === 'danger' ? 'text-orange-600' :
                            status === 'warning' ? 'text-yellow-600' : 'text-gray-400'
                          }`}>
                            {daysLeft !== null && daysLeft < 0
                              ? `${Math.abs(daysLeft)}日超過`
                              : daysLeft !== null
                              ? `あと${daysLeft}日`
                              : ''}
                          </p>
                        </>
                      ) : (
                        <p className="text-xs text-gray-400">期限なし</p>
                      )}
                    </div>
                  </div>
                  {q.issuedBy && (
                    <p className="text-xs text-gray-400 mt-2">発行: {q.issuedBy}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <p className="text-xs text-gray-400 text-center pb-2">
          資格情報の追加・変更は管理者にお申し付けください
        </p>
      </main>
    </div>
  )
}
