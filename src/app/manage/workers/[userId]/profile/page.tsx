import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { ProfileForm } from './ProfileForm'
import { QualificationList } from './QualificationList'
import { ResetPasswordForm } from './ResetPasswordForm'
import { calcWorkingMinutes, formatMinutes, REPORT_STATUS_LABEL, REPORT_STATUS_COLOR } from '@/lib/reportUtils'

export default async function WorkerProfilePage({ params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const thisMonth = new Date()
  const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
  const endOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0, 23, 59, 59)

  const [worker, monthReports, assignments, monthTimeEntries] = await Promise.all([
    prisma.user.findFirst({
      where: { id: params.userId, companyId: session.user.companyId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        workerProfile: true,
        workerQualifications: { orderBy: { createdAt: 'desc' } },
      },
    }),
    prisma.dailyReport.findMany({
      where: {
        userId: params.userId,
        reportDate: { gte: startOfMonth, lte: endOfMonth },
      },
      select: {
        id: true,
        reportDate: true,
        startTime: true,
        endTime: true,
        breakMinutes: true,
        status: true,
        site: { select: { id: true, name: true } },
      },
      orderBy: { reportDate: 'desc' },
    }),
    prisma.siteAssignment.findMany({
      where: { userId: params.userId },
      select: { site: { select: { id: true, name: true, status: true } } },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.timeEntry.findMany({
      where: {
        userId: params.userId,
        timestamp: { gte: startOfMonth, lte: endOfMonth },
      },
      include: { site: { select: { name: true } } },
      orderBy: { timestamp: 'desc' },
    }),
  ])

  if (!worker) redirect('/manage/workers')

  const totalWorkMin = monthReports.reduce((sum, r) => {
    if (!r.endTime) return sum
    return sum + calcWorkingMinutes(new Date(r.startTime), new Date(r.endTime), r.breakMinutes)
  }, 0)
  const submittedCount = monthReports.filter(r => r.status === 'SUBMITTED' || r.status === 'APPROVED').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/manage/workers" className="text-sm text-gray-500 hover:text-gray-700">
          ← 従業員一覧
        </Link>
      </div>

      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{worker.name}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{worker.email}{worker.phone ? ` / ${worker.phone}` : ''}</p>
        </div>
        <a
          href={`/api/manage/workers/${worker.id}/attendance-pdf?year=${thisMonth.getFullYear()}&month=${thisMonth.getMonth() + 1}`}
          target="_blank"
          className="shrink-0 px-3 py-1.5 border border-gray-300 bg-white text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
        >
          勤怠PDF
        </a>
      </div>

      {/* 今月の稼働サマリー */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">今月の実績</h2>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
            <p className="text-2xl font-bold" style={{ color: '#E85D04' }}>{monthReports.length}</p>
            <p className="text-xs text-gray-500 mt-1">日報件数</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
            <p className="text-2xl font-bold" style={{ color: '#455A64' }}>{submittedCount}</p>
            <p className="text-xs text-gray-500 mt-1">提出・承認済</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm text-center">
            <p className="text-xl font-bold" style={{ color: '#2E7D32' }}>{totalWorkMin > 0 ? formatMinutes(totalWorkMin) : '-'}</p>
            <p className="text-xs text-gray-500 mt-1">総実働時間</p>
          </div>
        </div>
      </div>

      {/* 担当現場 */}
      {assignments.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">担当現場</h2>
          <div className="flex flex-wrap gap-2">
            {assignments.map(({ site }) => (
              <Link
                key={site.id}
                href={`/manage/reports?siteId=${site.id}`}
                className="text-sm px-3 py-1.5 bg-white border border-gray-200 rounded-full text-gray-700 hover:border-orange-300 transition-colors"
              >
                {site.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 今月の日報履歴 */}
      {monthReports.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">今月の日報</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {monthReports.map((r) => {
                const workMin = r.endTime
                  ? calcWorkingMinutes(new Date(r.startTime), new Date(r.endTime), r.breakMinutes)
                  : null
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-gray-700 shrink-0">
                        {new Date(r.reportDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
                      </span>
                      <span className="text-xs text-gray-400 truncate">{r.site.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs text-gray-500">{workMin ? formatMinutes(workMin) : '-'}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${REPORT_STATUS_COLOR[r.status]}`}>
                        {REPORT_STATUS_LABEL[r.status]}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* 今月の打刻履歴 */}
      {monthTimeEntries.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">今月の打刻</h2>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {monthTimeEntries.map((e) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      e.type === 'CLOCK_IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {e.type === 'CLOCK_IN' ? '出勤' : '退勤'}
                    </span>
                    <span className="text-sm text-gray-700">
                      {e.timestamp.toLocaleString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <span className="text-xs text-gray-400 truncate max-w-[120px]">{e.site.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ProfileForm userId={worker.id} profile={worker.workerProfile} />

      <ResetPasswordForm workerId={worker.id} />

      <QualificationList userId={worker.id} qualifications={worker.workerQualifications} />
    </div>
  )
}
