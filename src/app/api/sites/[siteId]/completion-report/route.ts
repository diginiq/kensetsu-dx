import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { calcWorkingMinutes } from '@/lib/reportUtils'
import PDFDocument from 'pdfkit'
import path from 'path'
import fs from 'fs'

const PRIMARY = '#E85D04'
const SECONDARY = '#455A64'
const ACCENT = '#2E7D32'

export async function GET(_req: Request, { params }: { params: { siteId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    include: { company: { select: { name: true } } },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const [reports, photoCount, assignments, timeEntries] = await Promise.all([
    prisma.dailyReport.findMany({
      where: {
        siteId: params.siteId,
        status: { in: ['SUBMITTED', 'APPROVED'] },
        endTime: { not: null },
      },
      include: { user: { select: { name: true } } },
      orderBy: { reportDate: 'asc' },
    }),
    prisma.photo.count({ where: { siteId: params.siteId } }),
    prisma.siteAssignment.findMany({
      where: { siteId: params.siteId },
      include: { user: { select: { name: true } } },
    }),
    prisma.timeEntry.findMany({
      where: { siteId: params.siteId, type: 'CLOCK_IN' },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ])

  // 集計
  const totalWorkMin = reports.reduce((sum, r) => {
    if (!r.endTime) return sum
    return sum + calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes)
  }, 0)
  const totalWorkH = Math.floor(totalWorkMin / 60)
  const totalWorkM = totalWorkMin % 60

  // ワーカー別集計
  const workerStats: Record<string, { name: string; workDays: number; workMin: number }> = {}
  for (const r of reports) {
    if (!workerStats[r.userId]) {
      workerStats[r.userId] = { name: r.user.name, workDays: 0, workMin: 0 }
    }
    workerStats[r.userId].workDays++
    if (r.endTime) {
      workerStats[r.userId].workMin += calcWorkingMinutes(r.startTime, r.endTime, r.breakMinutes)
    }
  }

  // 工期計算
  const durationDays = site.startDate && site.endDate
    ? Math.ceil((site.endDate.getTime() - site.startDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  // PDF生成
  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.otf')
  const boldFontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Bold.otf')
  const hasFont = fs.existsSync(fontPath)

  const doc = new PDFDocument({ size: 'A4', margin: 40 })
  const chunks: Buffer[] = []
  doc.on('data', (chunk: Buffer) => chunks.push(chunk))

  await new Promise<void>((resolve) => {
    doc.on('end', resolve)

    if (hasFont) {
      doc.registerFont('Regular', fontPath)
      if (fs.existsSync(boldFontPath)) doc.registerFont('Bold', boldFontPath)
      else doc.registerFont('Bold', fontPath)
    }

    const W = 595 - 80 // A4幅 - margins

    // ヘッダー背景
    doc.rect(0, 0, 595, 80).fill(SECONDARY)
    doc.fill('white').font(hasFont ? 'Bold' : 'Helvetica-Bold').fontSize(20)
      .text('工事完了報告書', 40, 22)
    doc.fontSize(11).font(hasFont ? 'Regular' : 'Helvetica')
      .text(site.company.name, 40, 50)
    doc.fill('white').fontSize(9).text(
      `作成日: ${new Date().toLocaleDateString('ja-JP')}`, 400, 50, { align: 'right', width: 155 }
    )

    let y = 100

    // 現場情報
    doc.fill(SECONDARY).font(hasFont ? 'Bold' : 'Helvetica-Bold').fontSize(13)
      .text('■ 工事概要', 40, y)
    y += 20

    const infoRows: [string, string][] = [
      ['工事名称', site.name],
      ['発注者', site.clientName ?? '-'],
      ['所在地', site.address ?? '-'],
      ['請負金額', site.contractAmount ? `¥${site.contractAmount.toLocaleString('ja-JP')}` : '-'],
      ['工期開始', site.startDate ? site.startDate.toLocaleDateString('ja-JP') : '-'],
      ['工期完了', site.endDate ? site.endDate.toLocaleDateString('ja-JP') : '-'],
      ['工期日数', durationDays !== null ? `${durationDays}日` : '-'],
      ['現場ステータス', site.status === 'COMPLETED' ? '竣工完了' : site.status === 'ARCHIVED' ? 'アーカイブ済' : site.status],
    ]

    for (const [label, value] of infoRows) {
      doc.rect(40, y, 120, 18).fill('#f3f4f6')
      doc.fill('#374151').font(hasFont ? 'Regular' : 'Helvetica').fontSize(9)
        .text(label, 44, y + 4, { width: 112 })
      doc.fill('#111827').text(value, 164, y + 4, { width: W - 124 })
      y += 18
    }

    y += 15

    // 実績サマリー
    doc.fill(SECONDARY).font(hasFont ? 'Bold' : 'Helvetica-Bold').fontSize(13)
      .text('■ 実績サマリー', 40, y)
    y += 20

    const summaryCards: [string, string, string][] = [
      ['総写真枚数', `${photoCount}枚`, PRIMARY],
      ['日報提出件数', `${reports.length}件`, SECONDARY],
      ['総実働時間', `${totalWorkH}時間${totalWorkM > 0 ? totalWorkM + '分' : ''}`, ACCENT],
      ['参加人員', `${Object.keys(workerStats).length}名`, '#6B46C1'],
    ]

    const cardW = (W - 30) / 4
    summaryCards.forEach(([label, value, color], i) => {
      const cx = 40 + i * (cardW + 10)
      doc.rect(cx, y, cardW, 50).fill('#f9fafb').stroke('#e5e7eb')
      doc.fill(color).font(hasFont ? 'Bold' : 'Helvetica-Bold').fontSize(16)
        .text(value, cx + 4, y + 8, { width: cardW - 8, align: 'center' })
      doc.fill('#6b7280').font(hasFont ? 'Regular' : 'Helvetica').fontSize(8)
        .text(label, cx + 4, y + 32, { width: cardW - 8, align: 'center' })
    })
    y += 65

    // ワーカー別実績
    if (Object.keys(workerStats).length > 0) {
      doc.fill(SECONDARY).font(hasFont ? 'Bold' : 'Helvetica-Bold').fontSize(13)
        .text('■ 参加ワーカー別実績', 40, y)
      y += 20

      // テーブルヘッダー
      const cols = [200, 80, 100]
      const headers = ['氏名', '出勤日数', '実働時間']
      let cx = 40
      doc.rect(40, y, W, 18).fill('#455A64')
      for (let i = 0; i < headers.length; i++) {
        doc.fill('white').font(hasFont ? 'Bold' : 'Helvetica-Bold').fontSize(9)
          .text(headers[i], cx + 4, y + 4, { width: cols[i] - 8 })
        cx += cols[i]
      }
      y += 18

      const workerList = Object.values(workerStats).sort((a, b) => b.workDays - a.workDays)
      workerList.forEach((w, idx) => {
        const rowH = 16
        doc.rect(40, y, W, rowH).fill(idx % 2 === 0 ? 'white' : '#f9fafb')
        cx = 40
        const rowVals = [
          w.name,
          `${w.workDays}日`,
          `${Math.floor(w.workMin / 60)}時間${w.workMin % 60 > 0 ? (w.workMin % 60) + '分' : ''}`,
        ]
        for (let i = 0; i < rowVals.length; i++) {
          doc.fill('#374151').font(hasFont ? 'Regular' : 'Helvetica').fontSize(9)
            .text(rowVals[i], cx + 4, y + 3, { width: cols[i] - 8 })
          cx += cols[i]
        }
        y += rowH
      })
      y += 15
    }

    // 担当ワーカー一覧（割り当て済み）
    if (assignments.length > 0) {
      doc.fill(SECONDARY).font(hasFont ? 'Bold' : 'Helvetica-Bold').fontSize(13)
        .text('■ 担当ワーカー（割り当て）', 40, y)
      y += 15
      const names = assignments.map((a) => a.user.name).join('　')
      doc.fill('#374151').font(hasFont ? 'Regular' : 'Helvetica').fontSize(10).text(names, 40, y, { width: W })
      y += 20
    }

    // フッター
    doc.rect(0, 842 - 30, 595, 30).fill('#f3f4f6')
    doc.fill('#9ca3af').font(hasFont ? 'Regular' : 'Helvetica').fontSize(8)
      .text('建設DX - 工事完了報告書', 40, 842 - 20)
    doc.text(new Date().toLocaleString('ja-JP'), 400, 842 - 20, { align: 'right', width: 155 })

    doc.end()
  })

  const pdfBuffer = Buffer.concat(chunks)
  const filename = encodeURIComponent(`竣工報告書_${site.name}.pdf`)

  return new Response(pdfBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
