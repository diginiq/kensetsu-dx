import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { notifyUsers } from '@/lib/appNotifications'

const schema = z.object({
  siteId: z.string().min(1),
  type: z.enum(['CLOCK_IN', 'CLOCK_OUT']),
  requestedTimestamp: z.string().min(1),
  reason: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }

  const { siteId, type, requestedTimestamp, reason } = parsed.data

  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId },
  })
  if (!site) {
    return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })
  }

  await prisma.timeclockAmendRequest.create({
    data: {
      userId: session.user.id,
      companyId: session.user.companyId,
      siteId,
      type,
      requestedTimestamp: new Date(requestedTimestamp),
      reason,
    },
  })

  // 管理者に通知
  const admins = await prisma.user.findMany({
    where: { companyId: session.user.companyId, role: 'COMPANY_ADMIN', isActive: true },
    select: { id: true },
  })
  if (admins.length > 0) {
    const typeLabel = type === 'CLOCK_IN' ? '出勤' : '退勤'
    notifyUsers(admins.map((a) => a.id), {
      title: '打刻修正申請が届きました',
      body: `${session.user.name} が${typeLabel}打刻の修正を申請しました`,
      url: '/manage/timeclock',
    }).catch(() => {})
  }

  return NextResponse.json({ ok: true })
}
