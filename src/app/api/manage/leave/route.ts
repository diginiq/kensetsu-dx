import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  const requests = await prisma.leaveRequest.findMany({
    where: {
      companyId: session.user.companyId,
      ...(status ? { status } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(requests)
}
