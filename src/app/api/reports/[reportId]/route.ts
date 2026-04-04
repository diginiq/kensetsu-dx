import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { sendWebPushToUser } from '@/lib/pushNotifications'

export async function GET(_req: Request, { params }: { params: { reportId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const report = await prisma.dailyReport.findUnique({
    where: { id: params.reportId },
    include: {
      user: { select: { id: true, name: true } },
      site: { select: { id: true, name: true, companyId: true } },
      approvedBy: { select: { id: true, name: true } },
    },
  })

  if (!report) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  // アクセス権チェック
  const isOwner = report.userId === session.user.id
  const isAdmin = (session.user.role === 'COMPANY_ADMIN' && report.site.companyId === session.user.companyId)
    || session.user.role === 'SUPER_ADMIN'
  if (!isOwner && !isAdmin) return NextResponse.json({ error: '権限なし' }, { status: 403 })

  return NextResponse.json(report)
}

export async function PUT(req: Request, { params }: { params: { reportId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const report = await prisma.dailyReport.findUnique({ where: { id: params.reportId } })
  if (!report || report.userId !== session.user.id) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }
  if (report.status === 'APPROVED') {
    return NextResponse.json({ error: '承認済み日報は編集できません' }, { status: 400 })
  }

  const body = await req.json()
  const wasRejected = report.status === 'REJECTED'
  const isResubmit = wasRejected && body.status === 'SUBMITTED'

  const updated = await prisma.dailyReport.update({
    where: { id: params.reportId },
    include: { site: { select: { name: true, companyId: true } } },
    data: {
      startTime: body.startTime ? new Date(body.startTime) : undefined,
      endTime: body.endTime ? new Date(body.endTime) : null,
      breakMinutes: body.breakMinutes,
      weather: body.weather,
      workCategories: body.workCategories,
      photos: body.photos,
      memo: body.memo,
      status: body.status,
      ...(isResubmit ? { rejectReason: null } : {}),
    },
  })

  // 差し戻し→再提出時：管理者にプッシュ通知
  if (isResubmit) {
    const admins = await prisma.user.findMany({
      where: { companyId: updated.site.companyId, role: 'COMPANY_ADMIN', isActive: true },
      select: { id: true },
    })
    const dateStr = report.reportDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })
    for (const admin of admins) {
      sendWebPushToUser(admin.id, {
        title: '差し戻し日報が再提出されました',
        body: `${dateStr}（${updated.site.name}）の修正日報が届いています`,
        url: `/manage/reports`,
      }).catch(() => {})
    }
  }

  return NextResponse.json(updated)
}
