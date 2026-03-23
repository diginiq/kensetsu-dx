import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const qualifications = await prisma.workerQualification.findMany({
    where: { userId: params.userId, user: { companyId: session.user.companyId } },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(qualifications)
}

export async function POST(req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const worker = await prisma.user.findFirst({
    where: { id: params.userId, companyId: session.user.companyId },
  })
  if (!worker) return NextResponse.json({ error: '作業員が見つかりません' }, { status: 404 })

  const body = await req.json()

  const qual = await prisma.workerQualification.create({
    data: {
      userId: params.userId,
      name: body.name,
      category: body.category,
      certNumber: body.certNumber || null,
      issuedDate: body.issuedDate ? new Date(body.issuedDate) : null,
      expiresDate: body.expiresDate ? new Date(body.expiresDate) : null,
      issuedBy: body.issuedBy || null,
    },
  })

  return NextResponse.json(qual, { status: 201 })
}
