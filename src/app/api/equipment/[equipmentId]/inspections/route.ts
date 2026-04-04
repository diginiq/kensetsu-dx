import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: { equipmentId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const equipment = await prisma.equipment.findFirst({
    where: { id: params.equipmentId, companyId: session.user.companyId },
  })
  if (!equipment) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const inspections = await prisma.equipmentInspection.findMany({
    where: { equipmentId: params.equipmentId },
    include: { createdBy: { select: { name: true } } },
    orderBy: { inspectedAt: 'desc' },
  })

  return NextResponse.json(inspections)
}

export async function POST(req: Request, { params }: { params: { equipmentId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const equipment = await prisma.equipment.findFirst({
    where: { id: params.equipmentId, companyId: session.user.companyId },
  })
  if (!equipment) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const { inspectedAt, inspector, result, nextDueAt, memo } = await req.json()
  if (!inspectedAt || !inspector) {
    return NextResponse.json({ error: '点検日と点検者は必須です' }, { status: 400 })
  }

  const inspection = await prisma.equipmentInspection.create({
    data: {
      equipmentId: params.equipmentId,
      companyId: session.user.companyId,
      createdById: session.user.id,
      inspectedAt: new Date(inspectedAt),
      inspector,
      result: result || '合格',
      nextDueAt: nextDueAt ? new Date(nextDueAt) : null,
      memo: memo || null,
    },
    include: { createdBy: { select: { name: true } } },
  })

  // 次回点検日を機材マスタにも反映
  if (nextDueAt) {
    await prisma.equipment.update({
      where: { id: params.equipmentId },
      data: {
        inspectionDate: new Date(inspectedAt),
        nextInspection: new Date(nextDueAt),
      },
    })
  }

  return NextResponse.json(inspection, { status: 201 })
}
