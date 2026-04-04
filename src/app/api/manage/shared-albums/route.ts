import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')

  const albums = await prisma.sharedAlbum.findMany({
    where: {
      companyId: session.user.companyId,
      ...(siteId ? { siteId } : {}),
    },
    include: { site: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(albums.map((a) => ({ ...a, passwordHash: undefined })))
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }
  const { siteId, title, description, password, expiresAt, folderId } = await req.json()
  if (!siteId || !title) {
    return NextResponse.json({ error: '現場とタイトルは必須です' }, { status: 400 })
  }
  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const album = await prisma.sharedAlbum.create({
    data: {
      siteId,
      companyId: session.user.companyId,
      title,
      description: description || null,
      passwordHash: password ? await bcrypt.hash(password, 10) : null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      folderId: folderId || null,
    },
  })
  return NextResponse.json({ ...album, passwordHash: undefined }, { status: 201 })
}
