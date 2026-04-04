import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPhotoBuffer } from '@/lib/storage'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'

const SECONDARY = '#455A64'

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const folderId = searchParams.get('folderId')

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    select: { id: true, name: true },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const photos = await prisma.photo.findMany({
    where: {
      siteId: params.siteId,
      ...(folderId ? { folderId } : {}),
    },
    include: { folder: { select: { name: true } } },
    orderBy: [{ folderId: 'asc' }, { createdAt: 'asc' }],
    take: 100, // 最大100枚
  })

  if (photos.length === 0) {
    return NextResponse.json({ error: '写真がありません' }, { status: 404 })
  }

  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
  const hasFallback = fs.existsSync(fontPath)

  const doc = new PDFDocument({ size: 'A4', margin: 30, bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))

  if (hasFallback) doc.registerFont('NotoSans', fontPath)
  const font = hasFallback ? 'NotoSans' : 'Helvetica'

  // 表紙
  doc.rect(0, 0, doc.page.width, 100).fill(SECONDARY)
  doc.fillColor('white').font(font).fontSize(22).text('工事写真帳', 40, 28)
  doc.fontSize(11).text(site.name, 40, 58)
  doc.fontSize(9).text(`写真枚数: ${photos.length}枚　出力日: ${new Date().toLocaleDateString('ja-JP')}`, 40, 76)

  // 2列グリッドで写真を並べる
  const pageW = doc.page.width - 60  // 左右マージン各30
  const colW = (pageW - 10) / 2      // 2列, 間隔10
  const imgH = 150
  const captionH = 30
  const cellH = imgH + captionH + 8

  let col = 0
  let rowY = 115

  let currentFolder = ''

  for (let i = 0; i < photos.length; i++) {
    const photo = photos[i]
    const folderName = photo.folder?.name ?? 'その他'

    // フォルダ見出し
    if (folderName !== currentFolder) {
      currentFolder = folderName
      if (col !== 0) {
        col = 0
        rowY += cellH
      }
      if (rowY + 20 > doc.page.height - 30) {
        doc.addPage()
        rowY = 30
      }
      doc.rect(30, rowY, pageW, 18).fill('#F0F4F8')
      doc.fillColor(SECONDARY).font(font).fontSize(9)
        .text(folderName, 34, rowY + 5)
      rowY += 22
    }

    // 新しい行が必要か
    if (col === 0 && rowY + cellH > doc.page.height - 30) {
      doc.addPage()
      rowY = 30
    }

    const cellX = 30 + col * (colW + 10)

    // 画像埋め込み
    try {
      const buffer = await getPhotoBuffer(photo.s3Key)
      doc.image(buffer, cellX, rowY, { width: colW, height: imgH, cover: [colW, imgH] })
    } catch {
      // 画像取得失敗はグレーボックス
      doc.rect(cellX, rowY, colW, imgH).fill('#F0F0F0').stroke('#CCC')
      doc.fillColor('#AAA').font(font).fontSize(8)
        .text('画像なし', cellX, rowY + imgH / 2 - 5, { width: colW, align: 'center' })
    }

    // キャプション
    const takenStr = photo.takenAt
      ? new Date(photo.takenAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })
      : ''
    const captionText = `${takenStr}${photo.memo ? '　' + photo.memo : ''}`
    doc.fillColor('#333').font(font).fontSize(7.5)
      .text(captionText, cellX, rowY + imgH + 4, { width: colW, ellipsis: true })

    col++
    if (col >= 2) {
      col = 0
      rowY += cellH
    }
  }

  doc.end()
  const pdf = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const filename = encodeURIComponent(`写真帳_${site.name}.pdf`)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
