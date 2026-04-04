import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const subcontractors = await prisma.subcontractor.findMany({
    where: { companyId: session.user.companyId },
    include: {
      assignments: {
        include: { site: { select: { id: true, name: true } } },
      },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(subcontractors)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { name, contactName, phone, email, licenseNumber, insuranceExpiry, notes } = await req.json()
  if (!name) return NextResponse.json({ error: '会社名は必須です' }, { status: 400 })

  const sub = await prisma.subcontractor.create({
    data: {
      companyId: session.user.companyId,
      name,
      contactName: contactName || null,
      phone: phone || null,
      email: email || null,
      licenseNumber: licenseNumber || null,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
      notes: notes || null,
    },
  })
  return NextResponse.json(sub, { status: 201 })
}
