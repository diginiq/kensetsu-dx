import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const templates = await prisma.kYTemplate.findMany({
    where: { companyId: session.user.companyId },
    include: { site: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(templates)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { title, items, siteId } = await req.json()
  if (!title || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }
  const template = await prisma.kYTemplate.create({
    data: {
      companyId: session.user.companyId,
      siteId: siteId || null,
      title,
      items,
    },
  })
  return NextResponse.json(template, { status: 201 })
}
