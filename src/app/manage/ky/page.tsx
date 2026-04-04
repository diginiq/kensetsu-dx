import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { KYManageClient } from './KYManageClient'

export default async function KYManagePage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    redirect('/login')
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const [templates, sites, todaySubmissions] = await Promise.all([
    prisma.kYTemplate.findMany({
      where: { companyId: session.user.companyId },
      include: { site: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.site.findMany({
      where: { companyId: session.user.companyId, status: 'ACTIVE' },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.kYSubmission.findMany({
      where: {
        companyId: session.user.companyId,
        submittedDate: { gte: today, lt: tomorrow },
      },
      include: {
        user: { select: { name: true } },
        site: { select: { name: true } },
        template: { select: { title: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ])

  return (
    <KYManageClient
      templates={templates.map((t) => ({
        id: t.id,
        title: t.title,
        items: t.items as string[],
        isActive: t.isActive,
        siteId: t.siteId,
        siteName: t.site?.name ?? null,
        createdAt: t.createdAt.toISOString(),
      }))}
      sites={sites}
      todaySubmissions={todaySubmissions.map((s) => ({
        id: s.id,
        userName: s.user.name,
        siteName: s.site.name,
        templateTitle: s.template?.title ?? '（テンプレートなし）',
        createdAt: s.createdAt.toISOString(),
        notes: s.notes,
        items: s.items as { item: string; checked: boolean }[],
      }))}
    />
  )
}
