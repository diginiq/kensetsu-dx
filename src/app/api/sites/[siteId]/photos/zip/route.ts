import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPhotoBuffer } from '@/lib/storage'
import archiver from 'archiver'
import { PassThrough } from 'stream'

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    select: { id: true, name: true },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const photos = await prisma.photo.findMany({
    where: { siteId: params.siteId },
    include: { folder: { select: { name: true } } },
    orderBy: { createdAt: 'asc' },
  })

  if (photos.length === 0) {
    return NextResponse.json({ error: '写真がありません' }, { status: 404 })
  }

  // ZIP生成（PassThrough stream経由でReadableStreamに変換）
  const passThrough = new PassThrough()
  const archive = archiver('zip', { zlib: { level: 6 } })
  archive.pipe(passThrough)

  // 非同期で写真をZIPに追加
  ;(async () => {
    for (const photo of photos) {
      try {
        const buffer = await getPhotoBuffer(photo.s3Key)
        const folderName = photo.folder?.name ?? 'その他'
        const fileName = photo.fileName || photo.s3Key.split('/').pop() || `photo_${photo.id}.jpg`
        archive.append(buffer, { name: `${folderName}/${fileName}` })
      } catch {
        // 取得失敗の写真はスキップ
      }
    }
    await archive.finalize()
  })()

  // PassThroughをReadableStreamに変換
  const readable = new ReadableStream({
    start(controller) {
      passThrough.on('data', (chunk: Buffer) => controller.enqueue(chunk))
      passThrough.on('end', () => controller.close())
      passThrough.on('error', (err) => controller.error(err))
    },
  })

  const filename = encodeURIComponent(`${site.name}_写真一式.zip`)
  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
