import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPhotoUrl } from '@/lib/storage'

function thumbUrlForKey(s3Key: string): string {
  if (/\.jpe?g$/i.test(s3Key)) {
    return getPhotoUrl(s3Key.replace(/\.jpe?g$/i, '_thumb.jpg'))
  }
  return getPhotoUrl(s3Key)
}

/** 自社の現場写真からメッセージ添付用に最近の一覧を返す */
export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '会社未所属' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const take = Math.min(Number(searchParams.get('limit') ?? '48') || 48, 80)

  const sites = await prisma.site.findMany({
    where: { companyId: session.user.companyId },
    select: { id: true, name: true },
  })
  const siteIds = sites.map((s) => s.id)
  if (siteIds.length === 0) return NextResponse.json({ photos: [] })

  const nameBySite = Object.fromEntries(sites.map((s) => [s.id, s.name]))

  const photos = await prisma.photo.findMany({
    where: { siteId: { in: siteIds } },
    orderBy: { createdAt: 'desc' },
    take,
    select: {
      id: true,
      siteId: true,
      s3Key: true,
      fileName: true,
      mimeType: true,
      takenAt: true,
      createdAt: true,
    },
  })

  const result = photos.map((p) => ({
    id: p.id,
    siteId: p.siteId,
    siteName: nameBySite[p.siteId] ?? '',
    fileName: p.fileName,
    mimeType: p.mimeType,
    takenAt: p.takenAt?.toISOString() ?? null,
    url: getPhotoUrl(p.s3Key),
    thumbUrl: thumbUrlForKey(p.s3Key),
  }))

  return NextResponse.json({ photos: result })
}
