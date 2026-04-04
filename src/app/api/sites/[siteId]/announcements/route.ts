import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
  })
  if (!site) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const announcements = await prisma.siteAnnouncement.findMany({
    where: { siteId: params.siteId },
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 50,
  })

  return NextResponse.json(announcements)
}

export async function POST(req: Request, { params }: { params: { siteId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  if (session.user.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
  })
  if (!site) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const { title, body, pinned } = await req.json()
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'タイトルと本文を入力してください' }, { status: 400 })
  }

  const announcement = await prisma.siteAnnouncement.create({
    data: {
      siteId: params.siteId,
      companyId: session.user.companyId,
      createdById: session.user.id,
      title: title.trim(),
      body: body.trim(),
      pinned: !!pinned,
    },
    include: { createdBy: { select: { name: true } } },
  })

  return NextResponse.json(announcement, { status: 201 })
}
