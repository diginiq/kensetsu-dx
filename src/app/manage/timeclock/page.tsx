import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { TimeclockStatusClient } from './TimeclockStatusClient'
import { AmendRequestList } from './AmendRequestList'

export default async function ManageTimeclockPage({
  searchParams,
}: {
  searchParams: { date?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const companyId = session.user.companyId
  const dateStr = searchParams.date || new Date().toISOString().split('T')[0]
  const dayStart = new Date(dateStr)
  dayStart.setHours(0, 0, 0, 0)
  const dayEnd = new Date(dateStr)
  dayEnd.setHours(23, 59, 59, 999)

  const [workers, timeEntries, sites, pendingAmendRequests] = await Promise.all([
    prisma.user.findMany({
      where: { companyId, role: 'WORKER', isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.timeEntry.findMany({
      where: {
        user: { companyId },
        timestamp: { gte: dayStart, lte: dayEnd },
      },
      include: {
        user: { select: { id: true, name: true } },
        site: { select: { id: true, name: true } },
      },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.site.findMany({
      where: { companyId, status: { not: 'ARCHIVED' } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.timeclockAmendRequest.findMany({
      where: { companyId },
      include: {
        user: { select: { id: true, name: true } },
        site: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
    }),
  ])

  // ワーカーごとにステータスをまとめる
  const workerStatuses = workers.map((worker) => {
    const myEntries = timeEntries.filter((e) => e.userId === worker.id)
    const clockIn = myEntries.find((e) => e.type === 'CLOCK_IN') ?? null
    const clockOut = myEntries.find((e) => e.type === 'CLOCK_OUT') ?? null
    return {
      userId: worker.id,
      name: worker.name,
      clockIn: clockIn
        ? { id: clockIn.id, type: clockIn.type as 'CLOCK_IN', timestamp: clockIn.timestamp.toISOString(), siteName: clockIn.site.name }
        : null,
      clockOut: clockOut
        ? { id: clockOut.id, type: clockOut.type as 'CLOCK_OUT', timestamp: clockOut.timestamp.toISOString(), siteName: clockOut.site.name }
        : null,
      entries: myEntries.map((e) => ({
        id: e.id,
        type: e.type as 'CLOCK_IN' | 'CLOCK_OUT',
        timestamp: e.timestamp.toISOString(),
        siteName: e.site.name,
      })),
    }
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">打刻管理</h1>
        <form className="flex items-center gap-2">
          <label className="text-sm text-gray-600">日付:</label>
          <input
            type="date"
            name="date"
            defaultValue={dateStr}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium"
          >
            表示
          </button>
        </form>
      </div>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-gray-500">
          {new Date(dateStr).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })} の出退勤状況
        </p>
        <a
          href={`/api/timeclock/export?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`}
          className="px-3 py-1.5 text-sm border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
        >
          今月CSVダウンロード
        </a>
      </div>
      <TimeclockStatusClient
        workerStatuses={workerStatuses}
        sites={sites}
        workers={workers}
        dateStr={dateStr}
      />

      <AmendRequestList
        requests={pendingAmendRequests.map((r) => ({
          id: r.id,
          userName: r.user.name,
          siteName: r.site?.name ?? null,
          type: r.type,
          requestedTimestamp: r.requestedTimestamp.toISOString(),
          reason: r.reason,
          status: r.status,
          reviewNote: r.reviewNote,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </div>
  )
}
