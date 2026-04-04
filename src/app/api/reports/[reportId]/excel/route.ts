import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, { params }: { params: { reportId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const report = await prisma.dailyReport.findUnique({
    where: { id: params.reportId },
    include: {
      site: { select: { name: true, companyId: true } },
      user: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
  })

  if (!report || report.site.companyId !== session.user.companyId) {
    return NextResponse.json({ error: '見つかりません' }, { status: 404 })
  }

  const workCategories = report.workCategories as {
    category: string
    description: string
    workerCount: number
  }[]

  const isJournal = report.reportType === 'SITE_JOURNAL'
  const sheetTitle = isJournal ? '工事日誌' : '作業日報'
  const dateStr = new Date(report.reportDate).toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = '建設DX'
  const ws = wb.addWorksheet(sheetTitle)

  // 列幅設定
  ws.columns = [
    { width: 16 },
    { width: 30 },
    { width: 8 },
    { width: 40 },
  ]

  // タイトル行
  ws.mergeCells('A1:D1')
  const titleCell = ws.getCell('A1')
  titleCell.value = `${sheetTitle}　${report.site.name}　${dateStr}`
  titleCell.font = { bold: true, size: 14 }
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' }
  ws.getRow(1).height = 30

  // 基本情報
  const headerFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' },
  }

  const addInfoRow = (label: string, value: string) => {
    const row = ws.addRow([label, value])
    row.getCell(1).fill = headerFill
    row.getCell(1).font = { bold: true }
    row.getCell(1).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }
    ws.mergeCells(`B${row.number}:D${row.number}`)
    row.getCell(2).border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }
  }

  addInfoRow('現場名', report.site.name)
  addInfoRow('日付', dateStr)
  addInfoRow(isJournal ? '現場監督' : '職長', report.user.name ?? '')
  addInfoRow('天気', `${report.weather ?? ''}${report.temperature != null ? `　${report.temperature}℃` : ''}`)
  addInfoRow('作業時間', `${report.startTime ? new Date(report.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''}〜${report.endTime ? new Date(report.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : ''}`)
  addInfoRow('AI生成', report.aiGenerated ? 'はい' : 'いいえ')

  ws.addRow([])

  // 作業内容テーブルヘッダー
  const workHeader = ws.addRow(['工種', '作業内容', '人数', ''])
  workHeader.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF455A64' } }
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    cell.border = {
      top: { style: 'thin' }, bottom: { style: 'thin' },
      left: { style: 'thin' }, right: { style: 'thin' },
    }
  })
  ws.mergeCells(`C${workHeader.number}:D${workHeader.number}`)

  for (const cat of workCategories) {
    const row = ws.addRow([cat.category, cat.description, cat.workerCount, ''])
    ws.mergeCells(`C${row.number}:D${row.number}`)
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      }
      cell.alignment = { wrapText: true, vertical: 'top' }
    })
    row.getCell(2).alignment = { wrapText: true, vertical: 'top' }
    row.height = Math.max(20, Math.ceil(cat.description.length / 25) * 15)
  }

  ws.addRow([])

  // 備考・安全
  if (report.memo) {
    ws.mergeCells(`A${ws.rowCount + 1}:D${ws.rowCount + 1}`)
    const memoTitle = ws.lastRow!
    memoTitle.getCell(1).value = '備考・特記事項'
    memoTitle.getCell(1).font = { bold: true }
    memoTitle.getCell(1).fill = headerFill

    ws.mergeCells(`A${ws.rowCount + 1}:D${ws.rowCount + 1}`)
    const memoRow = ws.addRow([report.memo])
    memoRow.getCell(1).alignment = { wrapText: true, vertical: 'top' }
    memoRow.height = Math.max(30, Math.ceil(report.memo.length / 60) * 15)
    ws.addRow([])
  }

  if (report.safetyNotes) {
    ws.mergeCells(`A${ws.rowCount + 1}:D${ws.rowCount + 1}`)
    const safetyTitle = ws.lastRow!
    safetyTitle.getCell(1).value = '安全管理事項'
    safetyTitle.getCell(1).font = { bold: true }
    safetyTitle.getCell(1).fill = headerFill

    ws.mergeCells(`A${ws.rowCount + 1}:D${ws.rowCount + 1}`)
    const safetyRow = ws.addRow([report.safetyNotes])
    safetyRow.getCell(1).alignment = { wrapText: true, vertical: 'top' }
    safetyRow.height = Math.max(30, Math.ceil(report.safetyNotes.length / 60) * 15)
  }

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `${sheetTitle}_${report.site.name}_${dateStr.replace(/\//g, '-')}.xlsx`

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
