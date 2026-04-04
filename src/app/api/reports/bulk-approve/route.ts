import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { canApproveReport } from '@/lib/roles'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  reportIds: z.array(z.string()).min(1),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !canApproveReport(session.user.role) || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }

  // 自社の日報のみに限定
  const { count } = await prisma.dailyReport.updateMany({
    where: {
      id: { in: result.data.reportIds },
      status: 'SUBMITTED',
      site: { companyId: session.user.companyId },
    },
    data: {
      status: 'APPROVED',
      approvedById: session.user.id,
      approvedAt: new Date(),
    },
  })

  return NextResponse.json({ approved: count })
}
