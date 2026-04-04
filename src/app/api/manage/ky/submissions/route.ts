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
  const siteId = searchParams.get('siteId')
  const date = searchParams.get('date')

  const dateFilter = date ? new Date(date) : new Date()
  dateFilter.setHours(0, 0, 0, 0)
  const nextDay = new Date(dateFilter)
  nextDay.setDate(nextDay.getDate() + 1)

  const submissions = await prisma.kYSubmission.findMany({
    where: {
      companyId: session.user.companyId,
      ...(siteId ? { siteId } : {}),
      submittedDate: { gte: dateFilter, lt: nextDay },
    },
    include: {
      user: { select: { id: true, name: true } },
      site: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(submissions)
}
