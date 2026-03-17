import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { deleteFile, getPhotoUrl } from '@/lib/storage'

type Params = { params: { siteId: string; photoId: string } }

async function findPhoto(photoId: string, siteId: string, companyId: string) {
  return prisma.photo.findFirst({
    where: { id: photoId, siteId, site: { companyId } },
    include: { folder: { select: { id: true, name: true } } },
  })
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const photo = await findPhoto(params.photoId, params.siteId, session.user.companyId)
  if (!photo) return NextResponse.json({ error: '写真が見つかりません' }, { status: 404 })

  return NextResponse.json({
    ...photo,
    url: getPhotoUrl(photo.s3Key),
    thumbUrl: getPhotoUrl(photo.s3Key.replace(/\.jpg$/, '_thumb.jpg')),
  })
}

export async function PATCH(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const photo = await findPhoto(params.photoId, params.siteId, session.user.companyId)
  if (!photo) return NextResponse.json({ error: '写真が見つかりません' }, { status: 404 })

  const body = await req.json()
  const data: { memo?: string | null; folderId?: string | null } = {}
  if ('memo' in body) data.memo = body.memo ?? null
  if ('folderId' in body) data.folderId = body.folderId ?? null

  const updated = await prisma.photo.update({
    where: { id: params.photoId },
    data,
    include: { folder: { select: { id: true, name: true } } },
  })

  return NextResponse.json({
    ...updated,
    url: getPhotoUrl(updated.s3Key),
    thumbUrl: getPhotoUrl(updated.s3Key.replace(/\.jpg$/, '_thumb.jpg')),
  })
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const photo = await findPhoto(params.photoId, params.siteId, session.user.companyId)
  if (!photo) return NextResponse.json({ error: '写真が見つかりません' }, { status: 404 })

  // ストレージから削除
  await Promise.all([
    deleteFile(photo.s3Key),
    deleteFile(photo.s3Key.replace(/\.jpg$/, '_thumb.jpg')),
  ])

  await prisma.photo.delete({ where: { id: params.photoId } })

  return NextResponse.json({ message: '写真を削除しました' })
}
