import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId必須' }, { status: 400 })

  // siteId が自社のものか確認
  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const milestones = await prisma.siteMilestone.findMany({
    where: { siteId },
    orderBy: [{ sortOrder: 'asc' }, { plannedDate: 'asc' }],
  })
  return NextResponse.json(milestones)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { siteId, title, plannedDate, sortOrder } = await req.json()
  if (!siteId || !title || !plannedDate) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }
  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const milestone = await prisma.siteMilestone.create({
    data: { siteId, title, plannedDate: new Date(plannedDate), sortOrder: sortOrder ?? 0 },
  })
  return NextResponse.json(milestone, { status: 201 })
}
