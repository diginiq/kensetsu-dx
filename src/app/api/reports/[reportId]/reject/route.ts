import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(req: Request, { params }: { params: { reportId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { reason } = await req.json()

  const report = await prisma.dailyReport.findUnique({
    where: { id: params.reportId },
    include: { site: { select: { companyId: true } } },
  })

  if (!report || report.site.companyId !== session.user.companyId) {
    return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  }

  const updated = await prisma.dailyReport.update({
    where: { id: params.reportId },
    data: {
      status: 'REJECTED',
      rejectReason: reason || null,
      approvedById: null,
      approvedAt: null,
    },
  })

  return NextResponse.json(updated)
}
