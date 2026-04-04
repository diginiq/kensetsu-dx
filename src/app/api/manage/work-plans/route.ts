import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeAuditLog } from '@/lib/audit'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const weekStart = searchParams.get('weekStart')

  const plans = await prisma.weeklyWorkPlan.findMany({
    where: {
      companyId: session.user.companyId,
      ...(siteId ? { siteId } : {}),
      ...(weekStart ? { weekStart: new Date(weekStart) } : {}),
    },
    include: { site: { select: { name: true } } },
    orderBy: { weekStart: 'desc' },
    take: 20,
  })
  return NextResponse.json(plans)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { siteId, weekStart, items } = await req.json()
  if (!siteId || !weekStart || !Array.isArray(items)) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }
  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const plan = await prisma.weeklyWorkPlan.upsert({
    where: { siteId_weekStart: { siteId, weekStart: new Date(weekStart) } },
    create: {
      siteId,
      companyId: session.user.companyId,
      weekStart: new Date(weekStart),
      items,
      createdById: session.user.id,
    },
    update: { items, createdById: session.user.id },
  })

  writeAuditLog({
    companyId: session.user.companyId,
    userId: session.user.id,
    action: 'CREATE_WORK_PLAN',
    target: 'WeeklyWorkPlan',
    targetId: plan.id,
    detail: { siteId, weekStart },
  })

  return NextResponse.json(plan, { status: 201 })
}
