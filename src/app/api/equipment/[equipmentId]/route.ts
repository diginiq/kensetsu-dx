import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PUT(req: Request, { params }: { params: { equipmentId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const eq = await prisma.equipment.findFirst({
    where: { id: params.equipmentId, companyId: session.user.companyId },
  })
  if (!eq) return NextResponse.json({ error: '機械が見つかりません' }, { status: 404 })

  const body = await req.json()

  const updated = await prisma.equipment.update({
    where: { id: params.equipmentId },
    data: {
      name: body.name,
      model: body.model || null,
      manufacturer: body.manufacturer || null,
      serialNumber: body.serialNumber || null,
      inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : null,
      nextInspection: body.nextInspection ? new Date(body.nextInspection) : null,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: { params: { equipmentId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const eq = await prisma.equipment.findFirst({
    where: { id: params.equipmentId, companyId: session.user.companyId },
  })
  if (!eq) return NextResponse.json({ error: '機械が見つかりません' }, { status: 404 })

  await prisma.equipment.delete({ where: { id: params.equipmentId } })

  return NextResponse.json({ success: true })
}
