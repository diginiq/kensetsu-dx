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
  { params }: { params: { userId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const now = new Date()
  const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1))

  const worker = await prisma.user.findFirst({
    where: { id: params.userId, companyId: session.user.companyId },
    select: { id: true, name: true, email: true },
  })
  if (!worker) return NextResponse.json({ error: '従業員が見つかりません' }, { status: 404 })

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)

  const [timeEntries, reports] = await Promise.all([
    prisma.timeEntry.findMany({
      where: { userId: params.userId, timestamp: { gte: startOfMonth, lte: endOfMonth } },
      include: { site: { select: { name: true } } },
      orderBy: { timestamp: 'asc' },
    }),
    prisma.dailyReport.findMany({
      where: {
        userId: params.userId,
        reportDate: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['SUBMITTED', 'APPROVED'] },
      },
      include: { site: { select: { name: true } } },
      orderBy: { reportDate: 'asc' },
    }),
  ])

  // 日付ごとに打刻をグループ化
  const entryByDate: Record<string, { clockIn?: Date; clockOut?: Date; siteName?: string }> = {}
  for (const e of timeEntries) {
    const key = e.timestamp.toISOString().split('T')[0]
    if (!entryByDate[key]) entryByDate[key] = {}
    if (e.type === 'CLOCK_IN') {
      entryByDate[key].clockIn = e.timestamp
      entryByDate[key].siteName = e.site.name
    } else {
      entryByDate[key].clockOut = e.timestamp
    }
  }

  // 日付ごとに日報をグループ化
  const reportByDate: Record<string, typeof reports[0]> = {}
  for (const r of reports) {
    const key = r.reportDate.toISOString().split('T')[0]
    reportByDate[key] = r
  }

  const daysInMonth = new Date(year, month, 0).getDate()
  const allDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(year, month - 1, i + 1)
    const key = d.toISOString().split('T')[0]
    const entry = entryByDate[key]
    const report = reportByDate[key]
    const workMin = entry?.clockIn && entry?.clockOut
      ? Math.floor((entry.clockOut.getTime() - entry.clockIn.getTime()) / 60000)
      : report?.endTime
        ? calcWorkingMinutes(report.startTime, report.endTime, report.breakMinutes)
        : null
    return { date: d, key, entry, report, workMin }
  })

  const totalWorkMin = allDays.reduce((s, d) => s + (d.workMin ?? 0), 0)
  const workDays = allDays.filter((d) => d.workMin !== null && d.workMin > 0).length

  // PDF生成
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
  const hasFallback = fs.existsSync(fontPath)

  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))

  if (hasFallback) doc.registerFont('NotoSans', fontPath)
  const font = hasFallback ? 'NotoSans' : 'Helvetica'

  // ヘッダー
  doc.rect(0, 0, doc.page.width, 70).fill(SECONDARY)
  doc.fillColor('white').font(font).fontSize(18)
    .text('月次勤怠表', 40, 20)
  doc.fontSize(10)
    .text(`${year}年${month}月 / ${worker.name}`, 40, 46)

  // 会社名
  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  })
  doc.text(company?.name ?? '', doc.page.width - 40, 46, { align: 'right', width: doc.page.width - 80 })

  // サマリー
  let y = 90
  doc.fillColor(SECONDARY).font(font).fontSize(11).text('集計サマリー', 40, y)
  y += 18
  const summaryItems = [
    { label: '出勤日数', value: `${workDays}日` },
    { label: '総実働時間', value: `${Math.floor(totalWorkMin / 60)}時間${totalWorkMin % 60}分` },
  ]
  const cardW = 120
  summaryItems.forEach((item, i) => {
    const x = 40 + i * (cardW + 10)
    doc.rect(x, y, cardW, 44).fillAndStroke('#F8F8F8', '#E0E0E0')
    doc.fillColor('#666').fontSize(8).text(item.label, x + 8, y + 8)
    doc.fillColor(PRIMARY).fontSize(14).font(font).text(item.value, x + 8, y + 20)
  })

  // テーブルヘッダー
  y += 60
  const colWidths = [60, 60, 60, 60, 70, 80, 125]
  const headers = ['日付', '曜日', '出勤', '退勤', '実働時間', '現場', '備考']
  const tableLeft = 40
  doc.rect(tableLeft, y, doc.page.width - 80, 18).fill('#455A64')
  let x = tableLeft
  headers.forEach((h, i) => {
    doc.fillColor('white').fontSize(8).font(font)
      .text(h, x + 3, y + 5, { width: colWidths[i] - 6 })
    x += colWidths[i]
  })
  y += 18

  // テーブル行
  allDays.forEach((day) => {
    if (y > doc.page.height - 60) {
      doc.addPage()
      y = 40
    }

    const dow = day.date.getDay()
    const isWeekend = dow === 0 || dow === 6
    const isHoliday = day.workMin === null

    const rowColor = isHoliday ? '#F9F9F9' : '#FFFFFF'
    doc.rect(tableLeft, y, doc.page.width - 80, 16).fill(rowColor)
    doc.rect(tableLeft, y, doc.page.width - 80, 16).stroke('#E8E8E8')

    const dowLabel = ['日', '月', '火', '水', '木', '金', '土'][dow]
    const dowColor = dow === 0 ? '#CC0000' : dow === 6 ? '#0055CC' : '#333'

    const clockInStr = day.entry?.clockIn
      ? day.entry.clockIn.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      : day.report?.startTime
        ? day.report.startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        : '-'
    const clockOutStr = day.entry?.clockOut
      ? day.entry.clockOut.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
      : day.report?.endTime
        ? day.report.endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        : '-'
    const workStr = day.workMin
      ? `${Math.floor(day.workMin / 60)}h${day.workMin % 60 > 0 ? `${day.workMin % 60}m` : ''}`
      : '-'
    const siteStr = day.entry?.siteName ?? day.report?.site.name ?? ''
    const memo = day.report?.status === 'APPROVED' ? '承認済' : day.report ? '提出済' : ''

    const rowData = [
      { text: `${month}/${day.date.getDate()}`, color: '#333' },
      { text: dowLabel, color: dowColor },
      { text: clockInStr, color: '#333' },
      { text: clockOutStr, color: '#333' },
      { text: workStr, color: day.workMin ? PRIMARY : '#999' },
      { text: siteStr, color: '#555' },
      { text: memo, color: '#777' },
    ]

    x = tableLeft
    rowData.forEach((cell, i) => {
      doc.fillColor(cell.color).fontSize(8).font(font)
        .text(cell.text, x + 3, y + 4, { width: colWidths[i] - 6, ellipsis: true })
      x += colWidths[i]
    })
    y += 16
  })

  // フッター
  y += 10
  doc.moveTo(tableLeft, y).lineTo(doc.page.width - 40, y).stroke('#E0E0E0')
  y += 6
  doc.fillColor('#999').fontSize(8).font(font)
    .text(`出力日: ${new Date().toLocaleDateString('ja-JP')}  /  建設DX`, tableLeft, y)

  doc.end()
  const pdf = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const filename = encodeURIComponent(`勤怠表_${worker.name}_${year}年${month}月.pdf`)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
