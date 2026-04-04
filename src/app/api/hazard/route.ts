import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'
import { notifyUsers } from '@/lib/appNotifications'

const schema = z.object({
  siteId: z.string().min(1),
  occurredAt: z.string().min(1),
  location: z.string().min(1),
  type: z.enum(['NEAR_MISS', 'ACCIDENT', 'UNSAFE_CONDITION']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
  description: z.string().min(1),
  cause: z.string().optional(),
  countermeasure: z.string().optional(),
  injured: z.boolean().default(false),
  injuredCount: z.number().int().min(0).optional(),
})

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const status = searchParams.get('status')

  const reports = await prisma.hazardReport.findMany({
    where: {
      companyId: session.user.companyId,
      ...(siteId ? { siteId } : {}),
      ...(status ? { status } : {}),
    },
    include: {
      site: { select: { id: true, name: true } },
      reportedBy: { select: { id: true, name: true } },
    },
    orderBy: { occurredAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(reports)
}

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

  const { siteId, occurredAt, location, type, severity, description, cause, countermeasure, injured, injuredCount } = parsed.data

  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const report = await prisma.hazardReport.create({
    data: {
      companyId: session.user.companyId,
      siteId,
      reportedById: session.user.id,
      occurredAt: new Date(occurredAt),
      location,
      type,
      severity,
      description,
      cause: cause || null,
      countermeasure: countermeasure || null,
      injured,
      injuredCount: injured ? injuredCount : null,
    },
  })

  // 管理者に通知（HIGH重度 or 負傷あり → アプリ内 + プッシュ + LINE、それ以外はアプリ内のみ）
  const admins = await prisma.user.findMany({
    where: { companyId: session.user.companyId, role: 'COMPANY_ADMIN', isActive: true },
    select: { id: true },
  })
  if (admins.length > 0) {
    const typeLabel = type === 'NEAR_MISS' ? 'ヒヤリハット' : type === 'ACCIDENT' ? '事故' : '危険箇所'
    const isUrgent = severity === 'HIGH' || injured
    notifyUsers(admins.map((a) => a.id), {
      title: isUrgent ? `⚠️ 【緊急】${typeLabel}報告` : `📋 ${typeLabel}報告が提出されました`,
      body: `${site.name}・${location}`,
      url: '/manage/hazard',
    }).catch(() => {})
  }

  return NextResponse.json(report, { status: 201 })
}
