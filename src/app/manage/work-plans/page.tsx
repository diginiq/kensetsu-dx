import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { WorkPlanClient } from './WorkPlanClient'

export default async function WorkPlansPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    redirect('/login')
  }

  const [sites, plans] = await Promise.all([
    prisma.site.findMany({
      where: { companyId: session.user.companyId, status: { in: ['PLANNING', 'ACTIVE'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.weeklyWorkPlan.findMany({
      where: { companyId: session.user.companyId },
      include: { site: { select: { name: true } } },
      orderBy: { weekStart: 'desc' },
      take: 20,
    }),
  ])

  return (
    <WorkPlanClient
      sites={sites}
      plans={plans.map((p) => ({
        id: p.id,
        siteId: p.siteId,
        siteName: p.site.name,
        weekStart: p.weekStart.toISOString(),
        items: p.items as {
          date: string; task: string; workers: string; count: number; note: string
        }[],
      }))}
    />
  )
}
