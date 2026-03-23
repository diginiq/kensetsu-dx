import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const doc = await prisma.safetyDocument.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
  })
  if (!doc) return NextResponse.json({ error: '書類が見つかりません' }, { status: 404 })

  const updated = await prisma.safetyDocument.update({
    where: { id: params.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })

  return NextResponse.json(updated)
}
