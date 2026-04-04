import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: { reportId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const report = await prisma.hazardReport.findFirst({
    where: { id: params.reportId, companyId: session.user.companyId },
  })
  if (!report) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const body = await req.json()
  const updated = await prisma.hazardReport.update({
    where: { id: params.reportId },
    data: {
      status: body.status,
      closedAt: body.status === 'CLOSED' ? new Date() : null,
    },
  })

  return NextResponse.json(updated)
}
