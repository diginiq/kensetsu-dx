import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NewReportForm } from './NewReportForm'

export default async function NewReportPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // 担当現場取得
  let sites: { id: string; name: string }[]
  if (session.user.role === 'COMPANY_ADMIN' && session.user.companyId) {
    sites = await prisma.site.findMany({
      where: { companyId: session.user.companyId, status: { in: ['PLANNING', 'ACTIVE'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  } else {
    const assignments = await prisma.siteAssignment.findMany({
      where: { userId: session.user.id },
      include: { site: { select: { id: true, name: true, status: true } } },
    })
    sites = assignments
      .filter((a) => a.site.status === 'ACTIVE' || a.site.status === 'PLANNING')
      .map((a) => a.site)
  }

  // 前日の日報を取得（コピー用）
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)
  const yesterdayEnd = new Date(yesterday)
  yesterdayEnd.setHours(23, 59, 59, 999)

  const yesterdayReport = await prisma.dailyReport.findFirst({
    where: {
      userId: session.user.id,
      reportDate: { gte: yesterday, lte: yesterdayEnd },
    },
    select: { workCategories: true, breakMinutes: true, siteId: true },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <a href="/app/reports" className="text-white/80 hover:text-white">←</a>
          <p className="font-bold">日報作成</p>
        </div>
      </header>
      <NewReportForm
        sites={sites}
        yesterdayReport={yesterdayReport ? {
          workCategories: yesterdayReport.workCategories as unknown[],
          breakMinutes: yesterdayReport.breakMinutes,
          siteId: yesterdayReport.siteId,
        } : null}
      />
    </div>
  )
}
