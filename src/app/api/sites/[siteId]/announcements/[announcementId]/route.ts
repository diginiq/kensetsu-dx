import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(
  _req: Request,
  { params }: { params: { siteId: string; announcementId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const ann = await prisma.siteAnnouncement.findFirst({
    where: { id: params.announcementId, companyId: session.user.companyId ?? undefined },
  })
  if (!ann) return NextResponse.json({ error: '見つかりません' }, { status: 404 })

  await prisma.siteAnnouncement.delete({ where: { id: params.announcementId } })
  return NextResponse.json({ ok: true })
}
