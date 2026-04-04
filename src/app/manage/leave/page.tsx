import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LeaveManageClient } from './LeaveManageClient'

export default async function LeaveManagePage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    redirect('/login')
  }

  const requests = await prisma.leaveRequest.findMany({
    where: { companyId: session.user.companyId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <LeaveManageClient
      requests={requests.map((r) => ({
        id: r.id,
        userName: r.user.name,
        userId: r.user.id,
        type: r.type,
        startDate: r.startDate.toISOString(),
        endDate: r.endDate.toISOString(),
        reason: r.reason,
        status: r.status,
        reviewNote: r.reviewNote,
        createdAt: r.createdAt.toISOString(),
      }))}
    />
  )
}
