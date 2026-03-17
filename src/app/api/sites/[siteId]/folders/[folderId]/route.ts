import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type Params = { params: { siteId: string; folderId: string } }

async function checkOwnership(siteId: string, folderId: string, companyId: string) {
  const folder = await prisma.photoFolder.findFirst({
    where: { id: folderId, siteId, site: { companyId } },
  })
  return folder
}

export async function PUT(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const folder = await checkOwnership(params.siteId, params.folderId, session.user.companyId)
  if (!folder) return NextResponse.json({ error: 'フォルダが見つかりません' }, { status: 404 })

  const { name } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'フォルダ名を入力してください' }, { status: 400 })

  const updated = await prisma.photoFolder.update({
    where: { id: params.folderId },
    data: { name: name.trim() },
    include: { _count: { select: { photos: true } } },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const folder = await checkOwnership(params.siteId, params.folderId, session.user.companyId)
  if (!folder) return NextResponse.json({ error: 'フォルダが見つかりません' }, { status: 404 })

  // 写真のfolderId を null（未分類）にリセット、子フォルダも同様にしてから削除
  await prisma.$transaction(async (tx) => {
    // 子フォルダ内の写真を未分類に
    const children = await tx.photoFolder.findMany({ where: { parentFolderId: params.folderId } })
    for (const child of children) {
      await tx.photo.updateMany({ where: { folderId: child.id }, data: { folderId: null } })
      await tx.photoFolder.delete({ where: { id: child.id } })
    }
    // このフォルダの写真を未分類に
    await tx.photo.updateMany({ where: { folderId: params.folderId }, data: { folderId: null } })
    await tx.photoFolder.delete({ where: { id: params.folderId } })
  })

  return NextResponse.json({ message: 'フォルダを削除しました' })
}
