import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calcWorkingMinutes } from '@/lib/reportUtils'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'

const SECONDARY = '#455A64'
const PRIMARY = '#E85D04'

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    include: { company: { select: { name: true } } },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)

  const reports = await prisma.dailyReport.findMany({
    where: {
      siteId: params.siteId,
      reportDate: { gte: startOfMonth, lte: endOfMonth },
      status: { in: ['SUBMITTED', 'APPROVED'] },
    },
    include: {
      user: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: { reportDate: 'asc' },
  })

  const daysInMonth = new Date(year, month, 0).getDate()

  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
  const hasFallback = fs.existsSync(fontPath)

  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))

  if (hasFallback) doc.registerFont('NotoSans', fontPath)
  const font = hasFallback ? 'NotoSans' : 'Helvetica'

  // ヘッダー
  doc.rect(0, 0, doc.page.width, 80).fill(SECONDARY)
  doc.fillColor('white').font(font).fontSize(20).text('工事日誌', 40, 18)
  doc.fontSize(10).text(`${year}年${month}月`, 40, 46)
  doc.text(site.name, 40, 60)
  doc.text(site.company.name, doc.page.width - 40, 46, { align: 'right', width: doc.page.width - 80 })

  let y = 100
  // 月サマリー
  const totalWorkMin = reports.reduce((s, r) => r.endTime
    ? s + calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes) : s, 0)
  const uniqueWorkers = new Set(reports.map(r => r.userId)).size
  const approvedCount = reports.filter(r => r.status === 'APPROVED').length

  doc.font(font).fontSize(9).fillColor(SECONDARY).text('月間集計', 40, y)
  y += 14
  const summaries = [
    `日報件数: ${reports.length}件`,
    `総実働時間: ${Math.floor(totalWorkMin / 60)}h${totalWorkMin % 60}m`,
    `延べ人員: ${uniqueWorkers}名`,
    `承認済み: ${approvedCount}件`,
  ]
  doc.fillColor('#555').fontSize(8)
  summaries.forEach((s, i) => {
    doc.text(s, 40 + i * 130, y, { width: 125 })
  })
  y += 20

  // 区切り線
  doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#CCCCCC')
  y += 10

  // 日報一覧
  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day)
    const dayReports = reports.filter(r => {
      const d = new Date(r.reportDate)
      return d.getDate() === day
    })
    if (dayReports.length === 0) continue

    if (y > doc.page.height - 120) {
      doc.addPage()
      y = 40
    }

    const dow = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
    const dowColor = date.getDay() === 0 ? '#CC0000' : date.getDay() === 6 ? '#0055CC' : SECONDARY

    // 日付ヘッダー
    doc.rect(40, y, doc.page.width - 80, 16).fill('#F0F4F8')
    doc.fillColor(dowColor).font(font).fontSize(9)
      .text(`${month}月${day}日（${dow}）`, 44, y + 4)
    y += 16

    for (const r of dayReports) {
      if (y > doc.page.height - 80) {
        doc.addPage()
        y = 40
      }

      const workMin = r.endTime ? calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes) : null
      const startStr = r.startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      const endStr = r.endTime ? r.endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-'

      // 作業者行
      doc.fillColor('#333').font(font).fontSize(8)
        .text(`担当: ${r.user.name}　${startStr}〜${endStr}　実働: ${workMin ? `${Math.floor(workMin/60)}h${workMin%60}m` : '-'}　天候: ${r.weather ?? '-'}`, 46, y + 2)
      if (r.approvedBy) {
        doc.fillColor('#2E7D32').text(`承認: ${r.approvedBy.name}`, doc.page.width - 160, y + 2, { width: 120, align: 'right' })
      }
      y += 14

      // 作業内容
      const workCategories = r.workCategories as { category: string; detail?: string; hours: number }[]
      if (workCategories?.length) {
        workCategories.forEach((wc) => {
          if (y > doc.page.height - 40) { doc.addPage(); y = 40 }
          doc.fillColor('#555').fontSize(8)
            .text(`・${wc.category}${wc.detail ? ` / ${wc.detail}` : ''} （${wc.hours}h）`, 52, y)
          y += 12
        })
      }

      // メモ
      if (r.memo) {
        if (y > doc.page.height - 40) { doc.addPage(); y = 40 }
        doc.fillColor('#777').fontSize(7.5)
          .text(`備考: ${r.memo}`, 52, y, { width: doc.page.width - 100 })
        y += 12
      }
      y += 4
    }

    // 区切り線
    doc.moveTo(40, y).lineTo(doc.page.width - 40, y).stroke('#E8E8E8')
    y += 8
  }

  if (reports.length === 0) {
    doc.fillColor('#aaa').font(font).fontSize(10).text(`${year}年${month}月の日報データがありません`, 40, y)
  }

  doc.end()
  const pdf = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const filename = encodeURIComponent(`工事日誌_${site.name}_${year}年${month}月.pdf`)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
