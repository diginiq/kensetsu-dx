import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ManageSitesList } from './ManageSitesList'

export default async function ManageSitesPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const companyId = session.user.companyId

  const [sites, workers] = await Promise.all([
    prisma.site.findMany({
      where: { companyId, status: { not: 'ARCHIVED' } },
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          include: { user: { select: { id: true, name: true } } },
        },
        _count: { select: { photos: true } },
      },
    }),
    prisma.user.findMany({
      where: { companyId, role: 'WORKER', isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">現場管理</h1>
        <Link
          href="/dashboard/sites/new"
          className="px-4 py-2 text-white rounded-lg text-sm font-bold"
          style={{ backgroundColor: '#E85D04' }}
        >
          + 新規現場
        </Link>
      </div>
      <ManageSitesList sites={sites} workers={workers} />
    </div>
  )
}
