import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calcWorkingMinutes, formatMinutes } from '@/lib/reportUtils'
import path from 'path'
import fs from 'fs'

const REPORT_STATUS_LABEL: Record<string, string> = {
  DRAFT: '下書き',
  SUBMITTED: '提出済',
  APPROVED: '承認済',
  REJECTED: '差戻し',
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId || session.user.role !== 'COMPANY_ADMIN') {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()))
  const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
  const siteId = searchParams.get('siteId') ?? null

  const startOfMonth = new Date(year, month - 1, 1)
  const endOfMonth = new Date(year, month, 0, 23, 59, 59)

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  })

  const reports = await prisma.dailyReport.findMany({
    where: {
      site: { companyId: session.user.companyId },
      reportDate: { gte: startOfMonth, lte: endOfMonth },
      ...(siteId ? { siteId } : {}),
    },
    include: {
      user: { select: { name: true } },
      site: { select: { name: true } },
    },
    orderBy: [{ reportDate: 'asc' }, { user: { name: 'asc' } }],
  })

  if (reports.length === 0) {
    return NextResponse.json({ error: '対象の日報がありません' }, { status: 404 })
  }

  // pdfkit でPDF生成
  const PDFDocument = (await import('pdfkit')).default

  const doc = new PDFDocument({ size: 'A4', margin: 0, layout: 'landscape' })

  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.otf')
  if (fs.existsSync(fontPath)) {
    doc.registerFont('Japanese', fontPath)
    doc.font('Japanese')
  }

  // A4 landscape: 841 x 595
  const pageW = 841
  const pageH = 595
  const margin = 36

  // ヘッダー
  const headerH = 52
  doc.rect(0, 0, pageW, headerH).fill('#455A64')
  doc.fillColor('white').fontSize(16).text(
    `${year}年${month}月 月次勤怠記録`,
    margin, 12, { width: pageW - margin * 2 }
  )
  doc.fontSize(9).text(
    `${company?.name ?? ''}　　生成日: ${new Date().toLocaleDateString('ja-JP')}　　件数: ${reports.length}件`,
    margin, 33, { width: pageW - margin * 2 }
  )

  // テーブルヘッダー
  const cols = [
    { label: '日付',     w: 72  },
    { label: '従業員名', w: 88  },
    { label: '現場名',   w: 140 },
    { label: '出勤',     w: 52  },
    { label: '退勤',     w: 52  },
    { label: '休憩',     w: 44  },
    { label: '実働',     w: 60  },
    { label: 'ステータス', w: 60 },
    { label: '備考',     w: 0   }, // 残り全部
  ]
  const fixedW = cols.slice(0, -1).reduce((s, c) => s + c.w, 0)
  cols[cols.length - 1].w = pageW - margin * 2 - fixedW

  const rowH = 20
  const tblTop = headerH + 10

  doc.fillColor('#374151').fontSize(8)
  let cx = margin
  for (const col of cols) {
    doc.rect(cx, tblTop, col.w, rowH).fillAndStroke('#f3f4f6', '#e5e7eb')
    doc.fillColor('#6b7280').text(col.label, cx + 4, tblTop + 5, { width: col.w - 8, lineBreak: false })
    cx += col.w
  }

  // データ行
  let currentY = tblTop + rowH
  let totalWorkMin = 0

  for (let i = 0; i < reports.length; i++) {
    const r = reports[i]
    const workMin = r.endTime
      ? calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes)
      : null
    if (workMin) totalWorkMin += workMin

    // ページブレーク
    if (currentY + rowH > pageH - margin - rowH) {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 })
      currentY = margin
    }

    const bgColor = i % 2 === 0 ? 'white' : '#f9fafb'
    cx = margin

    const values = [
      new Date(r.reportDate).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' }),
      r.user.name,
      r.site.name,
      r.startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      r.endTime ? r.endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '-',
      `${r.breakMinutes}分`,
      workMin ? formatMinutes(workMin) : '-',
      REPORT_STATUS_LABEL[r.status] ?? r.status,
      r.memo ?? '',
    ]

    for (let ci = 0; ci < cols.length; ci++) {
      doc.rect(cx, currentY, cols[ci].w, rowH).fillAndStroke(bgColor, '#e5e7eb')
      doc.fillColor('#374151').fontSize(7.5).text(values[ci], cx + 4, currentY + 5, {
        width: cols[ci].w - 8,
        lineBreak: false,
        ellipsis: true,
      })
      cx += cols[ci].w
    }

    currentY += rowH
  }

  // フッター: 合計
  if (currentY + rowH + 4 > pageH - margin) {
    doc.addPage({ size: 'A4', layout: 'landscape', margin: 0 })
    currentY = margin
  }
  cx = margin
  const sumCols = [
    { val: '合計', w: cols[0].w },
    { val: `${reports.length}件`, w: cols[1].w },
    { val: '', w: cols[2].w },
    { val: '', w: cols[3].w },
    { val: '', w: cols[4].w },
    { val: '', w: cols[5].w },
    { val: formatMinutes(totalWorkMin), w: cols[6].w },
    { val: '', w: cols[7].w },
    { val: '', w: cols[8].w },
  ]
  currentY += 4
  for (const sc of sumCols) {
    doc.rect(cx, currentY, sc.w, rowH).fillAndStroke('#fef3c7', '#d97706')
    doc.fillColor('#92400e').fontSize(8).text(sc.val, cx + 4, currentY + 5, { width: sc.w - 8, lineBreak: false })
    cx += sc.w
  }

  doc.end()

  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))
  await new Promise<void>((resolve, reject) => {
    doc.on('end', resolve)
    doc.on('error', reject)
  })

  const pdfBuffer = Buffer.concat(chunks)
  const filename = `勤怠記録_${year}年${month}月.pdf`

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
