import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TimeclockClient } from './TimeclockClient'

export default async function TimeclockPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // 担当現場取得
  let sites: { id: string; name: string }[]
  if (session.user.role === 'COMPANY_ADMIN' && session.user.companyId) {
    sites = await prisma.site.findMany({
      where: { companyId: session.user.companyId, status: 'ACTIVE' },
      select: { id: true, name: true },
    })
  } else {
    const assignments = await prisma.siteAssignment.findMany({
      where: { userId: session.user.id },
      include: { site: { select: { id: true, name: true, status: true } } },
    })
    sites = assignments.filter((a) => a.site.status === 'ACTIVE').map((a) => a.site)
  }

  // 今日の打刻取得
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  const todayEntries = await prisma.timeEntry.findMany({
    where: {
      userId: session.user.id,
      timestamp: { gte: today, lt: tomorrow },
    },
    include: { site: { select: { name: true } } },
    orderBy: { timestamp: 'asc' },
  })

  // 今月の勤務時間（日報ベース）
  const thisMonth = new Date()
  const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
  const endOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0, 23, 59, 59)

  const monthlyReports = await prisma.dailyReport.findMany({
    where: {
      userId: session.user.id,
      reportDate: { gte: startOfMonth, lte: endOfMonth },
      status: { in: ['SUBMITTED', 'APPROVED'] },
      endTime: { not: null },
    },
    select: { startTime: true, endTime: true, breakMinutes: true },
  })

  const monthlyWorkMinutes = monthlyReports.reduce((sum, r) => {
    if (!r.endTime) return sum
    return sum + Math.max(0, Math.floor((r.endTime.getTime() - r.startTime.getTime()) / 60000) - r.breakMinutes)
  }, 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <a href="/app" className="text-white/80 hover:text-white">←</a>
          <p className="font-bold">出退勤打刻</p>
        </div>
      </header>
      <TimeclockClient
        sites={sites}
        todayEntries={todayEntries.map((e) => ({
          id: e.id,
          type: e.type,
          timestamp: e.timestamp.toISOString(),
          siteName: e.site.name,
        }))}
        monthlyWorkMinutes={monthlyWorkMinutes}
      />
    </div>
  )
}
