import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ProfileForm } from './ProfileForm'
import { QualificationList } from './QualificationList'

export default async function WorkerProfilePage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const worker = await prisma.user.findFirst({
    where: { id: params.userId, companyId: session.user.companyId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      workerProfile: true,
      workerQualifications: { orderBy: { createdAt: 'desc' } },
    },
  })

  if (!worker) redirect('/manage/workers')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/manage/workers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← 従業員一覧
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{worker.name}</h1>
          <p className="text-sm text-gray-500">{worker.email} {worker.phone ? `/ ${worker.phone}` : ''}</p>
        </div>
      </div>

      <ProfileForm userId={worker.id} profile={worker.workerProfile} />

      <QualificationList userId={worker.id} qualifications={worker.workerQualifications} />
    </div>
  )
}
