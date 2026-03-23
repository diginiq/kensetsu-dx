import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const doc = await prisma.safetyDocument.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: {
      site: { select: { id: true, name: true } },
    },
  })
  if (!doc) return NextResponse.json({ error: '書類が見つかりません' }, { status: 404 })

  return NextResponse.json(doc)
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const doc = await prisma.safetyDocument.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
  })
  if (!doc) return NextResponse.json({ error: '書類が見つかりません' }, { status: 404 })
  if (doc.status === 'ACCEPTED') {
    return NextResponse.json({ error: '受理済み書類は編集できません' }, { status: 400 })
  }

  const body = await req.json()

  const updated = await prisma.safetyDocument.update({
    where: { id: params.id },
    data: {
      title: body.title ?? doc.title,
      data: body.data ?? doc.data,
      status: 'DRAFT',
    },
  })

  return NextResponse.json(updated)
}
