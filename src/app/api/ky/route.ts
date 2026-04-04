import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')

  // 有効なテンプレート（現場専用 or 会社共通）
  const templates = await prisma.kYTemplate.findMany({
    where: {
      companyId: session.user.companyId,
      isActive: true,
      OR: [{ siteId: siteId ?? undefined }, { siteId: null }],
    },
    orderBy: [{ siteId: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const body = await req.json()
  const { siteId, templateId, items, notes, submittedDate } = body

  // 重複チェック
  const dateObj = new Date(submittedDate)
  const existing = await prisma.kYSubmission.findFirst({
    where: { siteId, userId: session.user.id, submittedDate: dateObj },
  })
  if (existing) {
    return NextResponse.json({ error: 'すでに本日のKY活動が提出されています' }, { status: 400 })
  }

  const submission = await prisma.kYSubmission.create({
    data: {
      companyId: session.user.companyId,
      siteId,
      userId: session.user.id,
      templateId: templateId ?? null,
      submittedDate: dateObj,
      items,
      notes: notes || null,
    },
  })
  return NextResponse.json(submission, { status: 201 })
}
