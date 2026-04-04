import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { HazardReportForm } from './HazardReportForm'

export default async function NewHazardReportPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const assignments = await prisma.siteAssignment.findMany({
    where: { userId: session.user.id },
    include: { site: { select: { id: true, name: true, status: true } } },
  })
  const sites = assignments
    .filter((a) => a.site.status === 'ACTIVE')
    .map((a) => ({ id: a.site.id, name: a.site.name }))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link href="/app" className="text-white/80 hover:text-white">←</Link>
          <p className="font-bold">ヒヤリハット報告</p>
        </div>
      </header>
      <HazardReportForm sites={sites} />
    </div>
  )
}
