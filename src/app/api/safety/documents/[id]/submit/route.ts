import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notifyUsers } from '@/lib/appNotifications'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const doc = await prisma.safetyDocument.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: { site: { select: { name: true } } },
  })
  if (!doc) return NextResponse.json({ error: '書類が見つかりません' }, { status: 404 })

  const updated = await prisma.safetyDocument.update({
    where: { id: params.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })

  // 管理者に通知
  const admins = await prisma.user.findMany({
    where: { companyId: session.user.companyId, role: 'COMPANY_ADMIN', isActive: true },
    select: { id: true },
  })
  if (admins.length > 0) {
    notifyUsers(
      admins.map((a) => a.id),
      {
        title: '安全書類が提出されました',
        body: `${doc.title}（${doc.site?.name ?? ''}）の確認をしてください`,
        url: `/manage/safety`,
      },
    ).catch(() => {})
  }

  return NextResponse.json(updated)
}
