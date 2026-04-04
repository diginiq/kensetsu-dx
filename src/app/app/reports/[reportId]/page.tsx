import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import {
  REPORT_STATUS_LABEL,
  REPORT_STATUS_COLOR,
  WorkCategory,
  calcWorkingMinutes,
  formatMinutes,
  calcOvertimeMinutes,
  WEATHER_OPTIONS,
} from '@/lib/reportUtils'

export default async function ReportDetailPage({ params }: { params: { reportId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const report = await prisma.dailyReport.findUnique({
    where: { id: params.reportId },
    include: {
      site: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  })

  if (!report || report.userId !== session.user.id) notFound()

  const workCategories = report.workCategories as WorkCategory[]
  const workingMinutes = report.endTime
    ? calcWorkingMinutes(report.startTime, report.endTime, report.breakMinutes)
    : null
  const overtimeMinutes = workingMinutes ? calcOvertimeMinutes(workingMinutes) : null

  const weatherIcon = WEATHER_OPTIONS.find((w) => w.value === report.weather)?.icon ?? ''

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app/reports" className="text-white/80 hover:text-white">←</Link>
            <p className="font-bold">日報詳細</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${REPORT_STATUS_COLOR[report.status]}`}>
              {REPORT_STATUS_LABEL[report.status]}
            </span>
            <a
              href={`/api/reports/${report.id}/excel`}
              className="text-white/80 hover:text-white text-xs border border-white/40 px-2 py-1 rounded-lg"
            >
              Excel
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-5 space-y-4">
        {/* 差戻し理由 */}
        {report.status === 'REJECTED' && report.rejectReason && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-sm font-bold text-red-700 mb-1">差戻し理由</p>
            <p className="text-sm text-red-600">{report.rejectReason}</p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
          <div className="flex justify-between">
            <div>
              <p className="text-sm text-gray-500">作業日</p>
              <p className="font-bold text-gray-800 text-lg">
                {new Date(report.reportDate).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl">{weatherIcon}</p>
              <p className="text-xs text-gray-500">{report.weather}</p>
            </div>
          </div>

          <div className="p-3 bg-gray-50 rounded-xl">
            <p className="text-xs text-gray-500 mb-1">現場</p>
            <p className="font-medium text-gray-800">{report.site.name}</p>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">出勤</p>
              <p className="font-bold text-gray-800">
                {report.startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">退勤</p>
              <p className="font-bold text-gray-800">
                {report.endTime ? report.endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-'}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500">実働</p>
              <p className="font-bold" style={{ color: '#E85D04' }}>
                {workingMinutes ? formatMinutes(workingMinutes) : '-'}
              </p>
            </div>
          </div>

          {overtimeMinutes !== null && overtimeMinutes > 0 && (
            <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-xl">
              <p className="text-sm text-yellow-800">残業時間</p>
              <p className="font-bold text-yellow-800">{formatMinutes(overtimeMinutes)}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-3">作業内容</h2>
          <div className="space-y-3">
            {workCategories.map((wc, i) => (
              <div key={i} className="border-l-4 border-orange-400 pl-3">
                <p className="font-medium text-gray-800">{wc.category}{wc.detail ? ` / ${wc.detail}` : ''}</p>
                <p className="text-sm text-gray-500">{wc.hours}時間</p>
                {wc.memo && <p className="text-xs text-gray-400 mt-0.5">{wc.memo}</p>}
              </div>
            ))}
          </div>
        </div>

        {report.memo && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-bold text-gray-700 mb-2">備考</h2>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{report.memo}</p>
          </div>
        )}

        {report.approvedBy && (
          <div className="text-center text-xs text-gray-400">
            {report.approvedAt?.toLocaleDateString('ja-JP')} に {report.approvedBy.name} が承認
          </div>
        )}

        {(report.status === 'DRAFT' || report.status === 'REJECTED') && (
          <div className="pt-2">
            <Link
              href={`/app/reports/${report.id}/edit`}
              className="block w-full py-3 text-center text-white font-bold rounded-xl"
              style={{ backgroundColor: '#E85D04' }}
            >
              編集する
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}
