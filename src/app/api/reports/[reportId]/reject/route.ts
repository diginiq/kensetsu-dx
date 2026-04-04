import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { canApproveReport } from '@/lib/roles'
import { prisma } from '@/lib/db'
import { sendMail, reportRejectedHtml } from '@/lib/mail'
import { notifyUser } from '@/lib/appNotifications'

export async function POST(req: Request, { params }: { params: { reportId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !canApproveReport(session.user.role)) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { reason } = await req.json()

  const report = await prisma.dailyReport.findUnique({
    where: { id: params.reportId },
    include: {
      site: { select: { companyId: true, name: true } },
      user: { select: { id: true, email: true, name: true } },
    },
  })

  if (!report || report.site.companyId !== session.user.companyId) {
    return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  }

  const updated = await prisma.dailyReport.update({
    where: { id: params.reportId },
    data: {
      status: 'REJECTED',
      rejectReason: reason || null,
      approvedById: null,
      approvedAt: null,
    },
  })

  const dateStr = report.reportDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })

  // メール通知
  sendMail({
    to: report.user.email,
    subject: '【建設DX】日報が差し戻されました',
    html: reportRejectedHtml(report.user.name, report.reportDate, report.site.name, reason),
  }).catch(() => {})

  // アプリ内通知 + プッシュ + LINE
  notifyUser(report.user.id, {
    title: '日報が差し戻されました',
    body: `${dateStr}（${report.site.name}）の日報を修正して再提出してください`,
    url: `/app/reports/${report.id}/edit`,
  }).catch(() => {})

  return NextResponse.json(updated)
}
