import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SubcontractorsClient } from './SubcontractorsClient'

export default async function SubcontractorsPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    redirect('/login')
  }

  const [subcontractors, sites] = await Promise.all([
    prisma.subcontractor.findMany({
      where: { companyId: session.user.companyId },
      include: {
        assignments: {
          include: { site: { select: { id: true, name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    }),
    prisma.site.findMany({
      where: { companyId: session.user.companyId, status: { in: ['PLANNING', 'ACTIVE'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ])

  const today = new Date()

  return (
    <SubcontractorsClient
      subcontractors={subcontractors.map((s) => ({
        id: s.id,
        name: s.name,
        contactName: s.contactName,
        phone: s.phone,
        email: s.email,
        licenseNumber: s.licenseNumber,
        insuranceExpiry: s.insuranceExpiry?.toISOString() ?? null,
        insuranceExpired: s.insuranceExpiry ? s.insuranceExpiry < today : false,
        notes: s.notes,
        isActive: s.isActive,
        assignments: s.assignments.map((a) => ({
          siteId: a.siteId,
          siteName: a.site.name,
          role: a.role,
          startDate: a.startDate?.toISOString() ?? null,
          endDate: a.endDate?.toISOString() ?? null,
        })),
      }))}
      sites={sites}
    />
  )
}
