import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPhotoBuffer } from '@/lib/storage'
import path from 'path'
import fs from 'fs'

export async function GET(req: Request, { params }: { params: { siteId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    select: { id: true, name: true },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '60'), 200)

  const photos = await prisma.photo.findMany({
    where: {
      siteId: site.id,
      ...(dateFrom ? { takenAt: { gte: new Date(dateFrom) } } : {}),
      ...(dateTo ? { takenAt: { lte: new Date(dateTo + 'T23:59:59') } } : {}),
    },
    orderBy: { takenAt: 'asc' },
    take: limit,
    select: { id: true, s3Key: true, fileName: true, takenAt: true, folder: { select: { name: true } } },
  })

  if (photos.length === 0) {
    return NextResponse.json({ error: '対象の写真がありません' }, { status: 404 })
  }

  // pdfkit でPDF生成
  const PDFDocument = (await import('pdfkit')).default

  const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })

  // 日本語フォント登録（public/fonts/NotoSansJP-Regular.otf があれば使用）
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.otf')
  if (fs.existsSync(fontPath)) {
    doc.registerFont('Japanese', fontPath)
    doc.font('Japanese')
  }

  const margin = 40
  const pageW = 595
  const colGap = 10
  const photoW = (pageW - margin * 2 - colGap) / 2  // ~252pt
  const photoH = Math.round(photoW * 0.75)           // 4:3 ratio
  const captionH = 28
  const rowGap = 12
  const slotH = photoH + captionH + rowGap

  // ヘッダー（1ページ目のみ）
  const headerH = 56
  doc.rect(0, 0, pageW, headerH).fill('#455A64')
  doc.fillColor('white').fontSize(16).text(site.name, margin, 16, { width: pageW - margin * 2 })
  const subText = `写真帳　${photos.length}枚　生成: ${new Date().toLocaleDateString('ja-JP')}`
  doc.fontSize(9).text(subText, margin, 36, { width: pageW - margin * 2 })
  doc.fillColor('black')

  let currentY = headerH + 16
  const pageH = 842

  for (let i = 0; i < photos.length; i++) {
    const col = i % 2

    // 行の先頭（左列）でページブレークチェック
    if (col === 0 && i > 0) {
      if (currentY + slotH > pageH - margin) {
        doc.addPage()
        currentY = margin
      }
    }

    const x = margin + col * (photoW + colGap)

    // 写真枠
    doc.rect(x, currentY, photoW, photoH).fillAndStroke('#f3f4f6', '#e5e7eb')
    doc.fillColor('black')

    try {
      const buffer = await getPhotoBuffer(photos[i].s3Key)
      doc.image(buffer, x, currentY, { fit: [photoW, photoH] })
    } catch {
      // 画像取得失敗時はプレースホルダー
      doc.fillColor('#9ca3af').fontSize(8).text('画像取得エラー', x, currentY + photoH / 2, {
        width: photoW, align: 'center',
      })
      doc.fillColor('black')
    }

    // キャプション
    const captionY = currentY + photoH + 4
    const photo = photos[i]
    const folderLabel = photo.folder ? `[${photo.folder.name}] ` : ''
    doc.fontSize(7).text(`${folderLabel}${photo.fileName}`, x, captionY, {
      width: photoW, ellipsis: true, lineBreak: false,
    })
    if (photo.takenAt) {
      doc.fontSize(7).text(
        new Date(photo.takenAt).toLocaleDateString('ja-JP'),
        x, captionY + 10, { width: photoW },
      )
    }

    // 右列の後、または最後の写真の後 → Y を次の行へ
    if (col === 1 || i === photos.length - 1) {
      currentY += slotH
    }
  }

  doc.end()

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  await new Promise<void>((resolve, reject) => {
    doc.on('end', resolve)
    doc.on('error', reject)
  })

  const pdfBuffer = Buffer.concat(chunks)
  const filename = `photo-report-${site.name}-${new Date().toLocaleDateString('ja-JP').replace(/\//g, '')}.pdf`

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
