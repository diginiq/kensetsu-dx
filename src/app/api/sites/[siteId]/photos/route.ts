import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadFile, getPhotoUrl } from '@/lib/storage'
import { Prisma } from '@prisma/client'

type Params = { params: { siteId: string } }

// 工種・細別に対応するフォルダを自動作成/取得
async function findOrCreateFolder(
  siteId: string,
  workCategory: string,
  workType: string,
  subType: string | null,
): Promise<string | null> {
  if (!workType) return null

  const wTypeCode = `${workCategory}/${workType}`

  let parentFolder = await prisma.photoFolder.findFirst({
    where: { siteId, workTypeCode: wTypeCode, parentFolderId: null },
  })
  if (!parentFolder) {
    parentFolder = await prisma.photoFolder.create({
      data: { siteId, name: workType, workTypeCode: wTypeCode },
    })
  }

  if (!subType) return parentFolder.id

  const subCode = `${wTypeCode}/${subType}`
  let childFolder = await prisma.photoFolder.findFirst({
    where: { siteId, workTypeCode: subCode, parentFolderId: parentFolder.id },
  })
  if (!childFolder) {
    childFolder = await prisma.photoFolder.create({
      data: { siteId, name: subType, workTypeCode: subCode, parentFolderId: parentFolder.id },
    })
  }

  return childFolder.id
}

// ─── GET: 写真一覧（フィルタ付き） ────────────────────────
export async function GET(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const site = await prisma.site.findFirst({ where: { id: params.siteId, companyId: session.user.companyId } })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('folderId')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const workType = searchParams.get('workType')
  const q = searchParams.get('q')
  const sort = searchParams.get('sort') ?? 'takenAt_desc'

  const where: Prisma.PhotoWhereInput = { siteId: params.siteId }

  if (folderId === 'unclassified') {
    where.folderId = null
  } else if (folderId) {
    where.folderId = folderId
  }

  if (dateFrom || dateTo) {
    where.takenAt = {}
    if (dateFrom) where.takenAt.gte = new Date(dateFrom)
    if (dateTo) where.takenAt.lte = new Date(dateTo + 'T23:59:59.999Z')
  }

  const orderBy: Prisma.PhotoOrderByWithRelationInput =
    sort === 'takenAt_asc' ? { takenAt: 'asc' } :
    sort === 'folder' ? { folderId: 'asc' } :
    { takenAt: 'desc' }

  let photos = await prisma.photo.findMany({
    where,
    orderBy,
    include: { folder: { select: { id: true, name: true } } },
  })

  // workType・テキスト検索はJS側でフィルタ（JSONフィールドのため）
  if (workType) {
    photos = photos.filter(p => {
      const bd = p.boardData as Record<string, string> | null
      return bd?.workType === workType || bd?.workCategory === workType
    })
  }
  if (q) {
    const lower = q.toLowerCase()
    photos = photos.filter(p => {
      const bd = p.boardData as Record<string, string> | null
      return (
        p.memo?.toLowerCase().includes(lower) ||
        bd?.location?.toLowerCase().includes(lower) ||
        bd?.constructionName?.toLowerCase().includes(lower)
      )
    })
  }

  const result = photos.map(p => ({
    ...p,
    url: getPhotoUrl(p.s3Key),
    thumbUrl: getPhotoUrl(p.s3Key.replace(/\.jpg$/, '_thumb.jpg')),
  }))

  return NextResponse.json(result)
}

// ─── POST: 写真アップロード + 自動フォルダ分類 ─────────────
export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId, status: { not: 'ARCHIVED' } },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  let formData: FormData
  try { formData = await req.formData() }
  catch { return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 }) }

  const imageFile = formData.get('image') as File | null
  if (!imageFile) return NextResponse.json({ error: '画像ファイルが必要です' }, { status: 400 })

  const boardDataStr = formData.get('boardData') as string | null
  const latStr = formData.get('lat') as string | null
  const lngStr = formData.get('lng') as string | null
  const takenAtStr = formData.get('takenAt') as string | null

  const buffer = Buffer.from(await imageFile.arrayBuffer())

  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const uuid = crypto.randomUUID()
  const key = `sites/${params.siteId}/${yyyy}/${mm}/${uuid}.jpg`
  const thumbKey = `sites/${params.siteId}/${yyyy}/${mm}/${uuid}_thumb.jpg`

  const { s3Key, url } = await uploadFile(buffer, key, 'image/jpeg')

  try {
    const sharp = (await import('sharp')).default
    const thumbBuffer = await sharp(buffer).resize({ width: 300, withoutEnlargement: true }).jpeg({ quality: 75 }).toBuffer()
    await uploadFile(thumbBuffer, thumbKey, 'image/jpeg')
  } catch { /* skip */ }

  // 自動フォルダ分類
  let folderId: string | null = null
  if (boardDataStr) {
    try {
      const bd = JSON.parse(boardDataStr) as Record<string, string>
      if (bd.workCategory && bd.workType) {
        folderId = await findOrCreateFolder(params.siteId, bd.workCategory, bd.workType, bd.subType || null)
      }
    } catch { /* skip */ }
  }

  const photo = await prisma.photo.create({
    data: {
      siteId: params.siteId,
      folderId,
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
