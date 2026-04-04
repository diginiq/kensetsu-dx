import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { LeaveRequestClient } from './LeaveRequestClient'

export default async function LeaveRequestPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link href="/app" className="text-white/80 hover:text-white">←</Link>
          <p className="font-bold">休暇・遅刻申請</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-5 pb-24">
        <LeaveRequestClient
          requests={requests.map((r) => ({
            id: r.id,
            type: r.type,
            startDate: r.startDate.toISOString(),
            endDate: r.endDate.toISOString(),
            reason: r.reason,
            status: r.status,
            reviewNote: r.reviewNote,
            createdAt: r.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  )
}
