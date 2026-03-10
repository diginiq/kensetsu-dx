import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadFile, getPhotoUrl } from '@/lib/storage'

type Params = { params: { siteId: string } }

// ─── GET: 写真一覧 ───────────────────────────────────────
export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const photos = await prisma.photo.findMany({
    where: { siteId: params.siteId },
    orderBy: { takenAt: 'desc' },
    select: {
      id: true,
      s3Key: true,
      fileName: true,
      boardData: true,
      latitude: true,
      longitude: true,
      takenAt: true,
      createdAt: true,
    },
  })

  // URLを付与して返す
  const result = photos.map((p) => ({
    ...p,
    url: getPhotoUrl(p.s3Key),
    thumbUrl: getPhotoUrl(p.s3Key.replace(/\.jpg$/, '_thumb.jpg')),
  }))

  return NextResponse.json(result)
}

// ─── POST: 写真アップロード ───────────────────────────────
export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId, status: { not: 'ARCHIVED' } },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const imageFile = formData.get('image') as File | null
  if (!imageFile) return NextResponse.json({ error: '画像ファイルが必要です' }, { status: 400 })

  const boardDataStr = formData.get('boardData') as string | null
  const latStr = formData.get('lat') as string | null
  const lngStr = formData.get('lng') as string | null
  const takenAtStr = formData.get('takenAt') as string | null

  const buffer = Buffer.from(await imageFile.arrayBuffer())

  // ユニークキーを生成（sites/{siteId}/{YYYY}/{MM}/{uuid}.jpg）
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const uuid = crypto.randomUUID()
  const key = `sites/${params.siteId}/${yyyy}/${mm}/${uuid}.jpg`
  const thumbKey = `sites/${params.siteId}/${yyyy}/${mm}/${uuid}_thumb.jpg`

  // メイン画像を保存
  const { s3Key, url } = await uploadFile(buffer, key, 'image/jpeg')

  // サムネイル生成（sharpが使用可能な場合のみ）
  try {
    const sharp = (await import('sharp')).default
    const thumbBuffer = await sharp(buffer)
      .resize({ width: 300, withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toBuffer()
    await uploadFile(thumbBuffer, thumbKey, 'image/jpeg')
  } catch {
    // sharp未対応環境ではスキップ
  }

  // DBに保存
  const photo = await prisma.photo.create({
    data: {
      siteId: params.siteId,
      s3Key,
      fileName: imageFile.name || `photo_${Date.now()}.jpg`,
      fileSize: buffer.length,
      mimeType: 'image/jpeg',
      boardData: boardDataStr ? JSON.parse(boardDataStr) : undefined,
      latitude: latStr ? parseFloat(latStr) : null,
      longitude: lngStr ? parseFloat(lngStr) : null,
      takenAt: takenAtStr ? new Date(takenAtStr) : now,
      syncStatus: 'SYNCED',
      uploadedById: session.user.id,
    },
  })

  return NextResponse.json({ photo, url }, { status: 201 })
}
