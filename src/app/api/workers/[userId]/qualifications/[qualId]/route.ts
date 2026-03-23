import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: { userId: string; qualId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const qual = await prisma.workerQualification.findFirst({
    where: { id: params.qualId, userId: params.userId, user: { companyId: session.user.companyId } },
  })
  if (!qual) return NextResponse.json({ error: '資格が見つかりません' }, { status: 404 })

  const body = await req.json()

  const updated = await prisma.workerQualification.update({
    where: { id: params.qualId },
    data: {
      name: body.name,
      category: body.category,
      certNumber: body.certNumber || null,
      issuedDate: body.issuedDate ? new Date(body.issuedDate) : null,
      expiresDate: body.expiresDate ? new Date(body.expiresDate) : null,
      issuedBy: body.issuedBy || null,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { userId: string; qualId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const qual = await prisma.workerQualification.findFirst({
    where: { id: params.qualId, userId: params.userId, user: { companyId: session.user.companyId } },
  })
  if (!qual) return NextResponse.json({ error: '資格が見つかりません' }, { status: 404 })

  await prisma.workerQualification.delete({ where: { id: params.qualId } })

  return NextResponse.json({ success: true })
}
