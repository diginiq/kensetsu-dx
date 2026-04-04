import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// ワーカーが自分の申請一覧を取得
export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const requests = await prisma.leaveRequest.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 30,
  })
  return NextResponse.json(requests)
}

// ワーカーが申請
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  const { type, startDate, endDate, reason } = await req.json()
  if (!type || !startDate || !endDate) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }

  const request = await prisma.leaveRequest.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      type,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      reason: reason || null,
    },
  })

  // 管理者に通知
  const admins = await prisma.user.findMany({
    where: { companyId: session.user.companyId, role: 'COMPANY_ADMIN', isActive: true },
    select: { id: true },
  })
  const { notifyUsers } = await import('@/lib/appNotifications')
  notifyUsers(
    admins.map((a) => a.id),
    {
      title: '休暇申請が届きました',
      body: `${session.user.name} さんから休暇申請（${formatType(type)}）が届きました`,
      url: '/manage/leave',
    }
  ).catch(() => {})

  return NextResponse.json(request, { status: 201 })
}

function formatType(type: string) {
  const map: Record<string, string> = {
    PAID: '有給休暇',
    ABSENCE: '欠勤',
    LATE: '遅刻',
    EARLY_LEAVE: '早退',
  }
  return map[type] ?? type
}
