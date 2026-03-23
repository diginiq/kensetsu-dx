import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const equipment = await prisma.equipment.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(equipment)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const body = await req.json()

  const eq = await prisma.equipment.create({
    data: {
      companyId: session.user.companyId,
      name: body.name,
      model: body.model || null,
      manufacturer: body.manufacturer || null,
      serialNumber: body.serialNumber || null,
      inspectionDate: body.inspectionDate ? new Date(body.inspectionDate) : null,
      nextInspection: body.nextInspection ? new Date(body.nextInspection) : null,
    },
  })

  return NextResponse.json(eq, { status: 201 })
}
