import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PLAN_LIMITS } from '@/lib/planLimits'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { plan: true },
  })

  // DBに保存されているファイルサイズの合計
  const result = await prisma.photo.aggregate({
    where: { site: { companyId: session.user.companyId } },
    _sum: { fileSize: true },
    _count: { id: true },
  })

  const totalBytes = result._sum.fileSize ?? 0
  const totalGb = totalBytes / (1024 * 1024 * 1024)
  const limitGb = PLAN_LIMITS[company?.plan as keyof typeof PLAN_LIMITS]?.storageLimitGb ?? 1
  const usagePercent = limitGb > 0 && limitGb !== Infinity
    ? Math.min(Math.round((totalGb / limitGb) * 100), 100)
    : 0

  return NextResponse.json({
    totalBytes,
    totalGb: Math.round(totalGb * 100) / 100,
    limitGb,
    usagePercent,
    photoCount: result._count.id,
  })
}
