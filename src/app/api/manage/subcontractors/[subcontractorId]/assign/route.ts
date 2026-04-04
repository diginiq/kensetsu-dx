import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 現場にアサイン
export async function POST(
  req: NextRequest,
  { params }: { params: { subcontractorId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { siteId, role, startDate, endDate } = await req.json()
  if (!siteId) return NextResponse.json({ error: 'siteId必須' }, { status: 400 })

  // 自社の協力会社か確認
  const sub = await prisma.subcontractor.findFirst({
    where: { id: params.subcontractorId, companyId: session.user.companyId },
  })
  if (!sub) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  const assignment = await prisma.subcontractorAssignment.upsert({
    where: { subcontractorId_siteId: { subcontractorId: params.subcontractorId, siteId } },
    create: {
      subcontractorId: params.subcontractorId,
      siteId,
      role: role || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
    update: {
      role: role || null,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  })
  return NextResponse.json(assignment)
}

// アサイン解除
export async function DELETE(
  req: NextRequest,
  { params }: { params: { subcontractorId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  if (!siteId) return NextResponse.json({ error: 'siteId必須' }, { status: 400 })

  await prisma.subcontractorAssignment.deleteMany({
    where: { subcontractorId: params.subcontractorId, siteId },
  })
  return NextResponse.json({ ok: true })
}
