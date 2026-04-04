import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { WorkCategory } from '@/lib/reportUtils'
import { EditReportForm } from './EditReportForm'

export default async function EditReportPage({ params }: { params: { reportId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const report = await prisma.dailyReport.findUnique({
    where: { id: params.reportId },
    include: { site: { select: { name: true } } },
  })

  if (!report || report.userId !== session.user.id) notFound()

  // 承認済みは編集不可
  if (report.status === 'APPROVED' || report.status === 'SUBMITTED') {
    redirect(`/app/reports/${params.reportId}`)
  }

  const dateStr = report.reportDate.toISOString().split('T')[0]
  const startTimeStr = report.startTime.toTimeString().slice(0, 5)
  const endTimeStr = report.endTime ? report.endTime.toTimeString().slice(0, 5) : '17:00'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link href={`/app/reports/${params.reportId}`} className="text-white/80 hover:text-white">←</Link>
          <p className="font-bold">
            {report.status === 'REJECTED' ? '差戻し日報を修正' : '日報を編集'}
          </p>
        </div>
      </header>

      <EditReportForm
        reportId={report.id}
        siteName={report.site.name}
        initialData={{
          reportDate: dateStr,
          weather: report.weather ?? '',
          startTime: startTimeStr,
          endTime: endTimeStr,
          breakMinutes: report.breakMinutes,
          workCategories: report.workCategories as WorkCategory[],
          memo: report.memo ?? '',
        }}
        isRejected={report.status === 'REJECTED'}
        rejectReason={report.rejectReason}
      />
    </div>
  )
}
