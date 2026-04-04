import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { subcontractorId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const data = await req.json()
  const updated = await prisma.subcontractor.updateMany({
    where: { id: params.subcontractorId, companyId: session.user.companyId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.contactName !== undefined ? { contactName: data.contactName || null } : {}),
      ...(data.phone !== undefined ? { phone: data.phone || null } : {}),
      ...(data.email !== undefined ? { email: data.email || null } : {}),
      ...(data.licenseNumber !== undefined ? { licenseNumber: data.licenseNumber || null } : {}),
      ...(data.insuranceExpiry !== undefined
        ? { insuranceExpiry: data.insuranceExpiry ? new Date(data.insuranceExpiry) : null }
        : {}),
      ...(data.notes !== undefined ? { notes: data.notes || null } : {}),
      ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { subcontractorId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  await prisma.subcontractor.deleteMany({
    where: { id: params.subcontractorId, companyId: session.user.companyId },
  })
  return NextResponse.json({ ok: true })
}
