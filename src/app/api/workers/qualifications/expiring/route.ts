import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  // 何日以内の期限切れを「警告」とするか（デフォルト60日）
  const withinDays = parseInt(searchParams.get('days') || '60')

  const now = new Date()
  const threshold = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000)

  // 期限切れ・まもなく期限切れの資格を全従業員分取得
  const qualifications = await prisma.workerQualification.findMany({
    where: {
      user: { companyId: session.user.companyId, isActive: true },
      expiresDate: { not: null, lte: threshold },
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { expiresDate: 'asc' },
  })

  const result = qualifications.map((q) => {
    const expires = new Date(q.expiresDate!)
    const diffDays = Math.ceil((expires.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return {
      id: q.id,
      userId: q.user.id,
      userName: q.user.name,
      name: q.name,
      category: q.category,
      certNumber: q.certNumber,
      expiresDate: q.expiresDate,
      daysUntilExpiry: diffDays,
      status: diffDays < 0 ? 'expired' : diffDays <= 30 ? 'danger' : 'warning',
    }
  })

  return NextResponse.json(result)
}
