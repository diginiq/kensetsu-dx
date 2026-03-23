import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const user = await prisma.user.findFirst({
    where: { id: params.userId, companyId: session.user.companyId },
    select: {
      id: true, name: true, email: true, phone: true,
      workerProfile: true,
      workerQualifications: { orderBy: { createdAt: 'desc' } },
    },
  })
  if (!user) return NextResponse.json({ error: '作業員が見つかりません' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PUT(req: Request, { params }: { params: { userId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const worker = await prisma.user.findFirst({
    where: { id: params.userId, companyId: session.user.companyId },
  })
  if (!worker) return NextResponse.json({ error: '作業員が見つかりません' }, { status: 404 })

  const body = await req.json()

  const profile = await prisma.workerProfile.upsert({
    where: { userId: params.userId },
    create: { userId: params.userId, ...body },
    update: body,
  })

  return NextResponse.json(profile)
}
