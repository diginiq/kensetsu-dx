import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { milestoneId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const data = await req.json()
  const milestone = await prisma.siteMilestone.findFirst({
    where: {
      id: params.milestoneId,
      site: { companyId: session.user.companyId },
    },
  })
  if (!milestone) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const updated = await prisma.siteMilestone.update({
    where: { id: params.milestoneId },
    data: {
      ...(data.title !== undefined ? { title: data.title } : {}),
      ...(data.plannedDate !== undefined ? { plannedDate: new Date(data.plannedDate) } : {}),
      ...(data.completedAt !== undefined
        ? { completedAt: data.completedAt ? new Date(data.completedAt) : null }
        : {}),
      ...(data.sortOrder !== undefined ? { sortOrder: data.sortOrder } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { milestoneId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  await prisma.siteMilestone.deleteMany({
    where: {
      id: params.milestoneId,
      site: { companyId: session.user.companyId },
    },
  })
  return NextResponse.json({ ok: true })
}
