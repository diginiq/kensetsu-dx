import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/appNotifications'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const body = await req.json()
  const { action, reviewNote } = body // action: 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: '不正なアクション' }, { status: 400 })
  }

  const request = await prisma.timeclockAmendRequest.findFirst({
    where: { id: params.requestId, companyId: session.user.companyId, status: 'PENDING' },
  })
  if (!request) {
    return NextResponse.json({ error: '申請が見つかりません' }, { status: 404 })
  }

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'

  await prisma.$transaction(async (tx) => {
    await tx.timeclockAmendRequest.update({
      where: { id: params.requestId },
      data: {
        status: newStatus,
        reviewedById: session.user.id,
        reviewNote: reviewNote ?? null,
        reviewedAt: new Date(),
      },
    })

    // 承認時は打刻レコードを作成
    if (action === 'approve') {
      await tx.timeEntry.create({
        data: {
          userId: request.userId,
          siteId: request.siteId!,
          type: request.type as 'CLOCK_IN' | 'CLOCK_OUT',
          timestamp: request.requestedTimestamp,
        },
      })
    }
  })

  // ワーカーに結果を通知
  const typeLabel = request.type === 'CLOCK_IN' ? '出勤' : '退勤'
  const approved = action === 'approve'
  notifyUser(request.userId, {
    title: approved ? '打刻修正が承認されました' : '打刻修正が却下されました',
    body: `${typeLabel}打刻の修正申請が${approved ? '承認' : '却下'}されました${reviewNote ? `：${reviewNote}` : ''}`,
    url: '/app/timeclock/history',
  }).catch(() => {})

  return NextResponse.json({ ok: true })
}
