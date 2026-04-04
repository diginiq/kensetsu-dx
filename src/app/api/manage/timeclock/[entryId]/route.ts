import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 管理者による打刻削除
export async function DELETE(_req: Request, { params }: { params: { entryId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const entry = await prisma.timeEntry.findFirst({
    where: {
      id: params.entryId,
      user: { companyId: session.user.companyId ?? undefined },
    },
  })
  if (!entry) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.timeEntry.delete({ where: { id: params.entryId } })
  return NextResponse.json({ ok: true })
}
