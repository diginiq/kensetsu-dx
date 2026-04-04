import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { WorkerForm } from '@/components/features/workers/WorkerForm'
import { WorkerListClient } from './WorkerListClient'

export default async function ManageWorkersPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const [workers, expiringCount] = await Promise.all([
    prisma.user.findMany({
      where: {
        companyId: session.user.companyId,
        role: { in: ['WORKER', 'FOREMAN', 'SITE_SUPERVISOR'] },
      },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.workerQualification.count({
      where: {
        user: { companyId: session.user.companyId, isActive: true },
        expiresDate: {
          not: null,
          lte: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60日以内
        },
      },
    }),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">従業員管理</h1>
        <Link
          href="/manage/workers/qualifications"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-colors ${
            expiringCount > 0
              ? 'bg-red-100 text-red-700 hover:bg-red-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          資格期限管理
          {expiringCount > 0 && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full font-bold">
              {expiringCount}
            </span>
          )}
        </Link>
      </div>

      <WorkerForm />

      <WorkerListClient workers={workers} />
    </div>
  )
}
