import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { canApproveReport } from '@/lib/roles'
import { prisma } from '@/lib/db'
import { sendMail, reportApprovedHtml } from '@/lib/mail'
import { sendWebPushToUser } from '@/lib/pushNotifications'
import { writeAuditLog } from '@/lib/audit'

export async function POST(_req: Request, { params }: { params: { reportId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !canApproveReport(session.user.role)) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

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
      status: 'APPROVED',
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
  })

  writeAuditLog({
    companyId: session.user.companyId,
    userId: session.user.id,
    action: 'APPROVE_REPORT',
    target: 'DailyReport',
    targetId: params.reportId,
  })

  const dateStr = report.reportDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })

  // メール通知
  sendMail({
    to: report.user.email,
    subject: '【建設DX】日報が承認されました',
    html: reportApprovedHtml(report.user.name, report.reportDate, report.site.name),
  }).catch(() => {})

  // プッシュ通知
  sendWebPushToUser(report.user.id, {
    title: '日報が承認されました',
    body: `${dateStr}（${report.site.name}）の日報が承認されました`,
    url: `/app/reports/${report.id}`,
  }).catch(() => {})

  return NextResponse.json(updated)
}
