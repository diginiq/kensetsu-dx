import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const weekStart = searchParams.get('weekStart')
  if (!weekStart) return NextResponse.json({ error: 'weekStart必須' }, { status: 400 })

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    select: { name: true },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const plan = await prisma.weeklyWorkPlan.findUnique({
    where: { siteId_weekStart: { siteId: params.siteId, weekStart: new Date(weekStart) } },
  })
  if (!plan) return NextResponse.json({ error: '作業計画が見つかりません' }, { status: 404 })

  const items = plan.items as {
    date: string; task: string; workers: string; count: number; note: string
  }[]

  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
  const hasFont = fs.existsSync(fontPath)

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))

  const font = hasFont ? fontPath : 'Helvetica'

  // ヘッダー
  doc.rect(40, 40, 515, 40).fill('#455A64')
  doc.font(font).fontSize(16).fillColor('white')
    .text('週次作業計画書', 55, 52, { width: 485 })
  doc.fillColor('black')

  doc.font(font).fontSize(10).fillColor('#333')
  doc.text(`現場名: ${site.name}`, 40, 95)
  const ws = new Date(weekStart)
  const we = new Date(ws); we.setDate(we.getDate() + 6)
  doc.text(
    `対象週: ${ws.toLocaleDateString('ja-JP')} 〜 ${we.toLocaleDateString('ja-JP')}`,
    40, 110
  )
  doc.text(`出力日: ${new Date().toLocaleDateString('ja-JP')}`, 40, 125)

  // テーブルヘッダー
  const tableTop = 150
  const cols = [60, 180, 100, 50, 125] // 日付/作業内容/担当者/人数/備考
  const headers = ['日付', '作業内容', '担当者', '人数', '備考・注意事項']
  let x = 40
  doc.rect(40, tableTop, 515, 20).fill('#E85D04')
  headers.forEach((h, i) => {
    doc.font(font).fontSize(9).fillColor('white')
      .text(h, x + 3, tableTop + 5, { width: cols[i] - 4 })
    x += cols[i]
  })

  // テーブル行
  let y = tableTop + 20
  items.forEach((item, idx) => {
    const rowH = 28
    if (idx % 2 === 0) doc.rect(40, y, 515, rowH).fill('#f9f9f9')
    else doc.rect(40, y, 515, rowH).fill('white')
    doc.strokeColor('#ddd').lineWidth(0.5)
    doc.moveTo(40, y).lineTo(555, y).stroke()

    const d = new Date(item.date)
    const dateStr = `${d.getMonth() + 1}/${d.getDate()}(${['日','月','火','水','木','金','土'][d.getDay()]})`
    const rowData = [dateStr, item.task, item.workers, String(item.count || ''), item.note || '']
    x = 40
    rowData.forEach((val, i) => {
      doc.font(font).fontSize(9).fillColor('#333')
        .text(val, x + 3, y + 7, { width: cols[i] - 6, height: 20 })
      x += cols[i]
    })
    y += rowH
  })

  // 外枠
  doc.rect(40, tableTop, 515, y - tableTop).stroke('#ddd')

  // 署名欄
  y += 20
  doc.font(font).fontSize(9).fillColor('#666')
    .text('作成者: _______________　　確認者: _______________　　日付: _______________', 40, y)

  doc.end()

  await new Promise<void>((resolve) => doc.on('end', resolve))
  const pdf = Buffer.concat(chunks)

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="work_plan_${weekStart}.pdf"`,
    },
  })
}
