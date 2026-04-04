import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUser } from '@/lib/appNotifications'
import { writeAuditLog } from '@/lib/audit'

const TYPE_LABEL: Record<string, string> = {
  PAID: '有給休暇',
  ABSENCE: '欠勤',
  LATE: '遅刻',
  EARLY_LEAVE: '早退',
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { requestId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { action, reviewNote } = await req.json()
  if (action !== 'approve' && action !== 'reject') {
    return NextResponse.json({ error: 'action は approve または reject' }, { status: 400 })
  }

  const leaveRequest = await prisma.leaveRequest.findFirst({
    where: { id: params.requestId, companyId: session.user.companyId },
  })
  if (!leaveRequest) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const newStatus = action === 'approve' ? 'APPROVED' : 'REJECTED'
  const updated = await prisma.leaveRequest.update({
    where: { id: params.requestId },
    data: {
      status: newStatus,
      reviewedById: session.user.id,
      reviewNote: reviewNote || null,
      reviewedAt: new Date(),
    },
  })

  const typeLabel = TYPE_LABEL[leaveRequest.type] ?? leaveRequest.type
  writeAuditLog({
    companyId: session.user.companyId,
    userId: session.user.id,
    action: action === 'approve' ? 'APPROVE_LEAVE' : 'REJECT_LEAVE',
    target: 'LeaveRequest',
    targetId: params.requestId,
  })

  notifyUser(leaveRequest.userId, {
    title: action === 'approve' ? `休暇申請が承認されました` : `休暇申請が却下されました`,
    body: `${typeLabel}の申請が${action === 'approve' ? '承認' : '却下'}されました${reviewNote ? `。メモ: ${reviewNote}` : ''}`,
    url: '/app/leave',
  }).catch(() => {})

  return NextResponse.json(updated)
}
