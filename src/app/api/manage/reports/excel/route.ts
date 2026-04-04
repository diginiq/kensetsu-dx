import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { canAccessManage } from '@/lib/roles'
import { prisma } from '@/lib/db'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !canAccessManage(session.user.role) || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const siteId = searchParams.get('siteId')
  const status = searchParams.get('status')

  const reports = await prisma.dailyReport.findMany({
    where: {
      site: { companyId: session.user.companyId },
      ...(siteId ? { siteId } : {}),
      ...(status ? { status: status as 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' } : {}),
      ...(dateFrom || dateTo ? {
        reportDate: {
          ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
          ...(dateTo ? { lte: new Date(dateTo) } : {}),
        },
      } : {}),
    },
    include: {
      site: { select: { name: true } },
      user: { select: { name: true } },
      approvedBy: { select: { name: true } },
    },
    orderBy: [{ reportDate: 'desc' }, { reportType: 'asc' }],
  })

  const workDiaries = reports.filter((r) => r.reportType === 'WORK_DIARY')
  const siteJournals = reports.filter((r) => r.reportType === 'SITE_JOURNAL')

  const wb = new ExcelJS.Workbook()
  wb.creator = '建設DX'

  const STATUS_LABEL: Record<string, string> = {
    DRAFT: '下書き',
    SUBMITTED: '提出済',
    APPROVED: '承認済',
    REJECTED: '差し戻し',
  }

  const HEADER_FILL: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF455A64' },
  }

  const buildSheet = (
    sheetName: string,
    rows: typeof reports,
    roleLabel: string,
  ) => {
    const ws = wb.addWorksheet(sheetName)
    ws.columns = [
      { header: '日付', key: 'date', width: 14 },
      { header: '現場', key: 'site', width: 22 },
      { header: roleLabel, key: 'user', width: 12 },
      { header: '天気', key: 'weather', width: 10 },
      { header: '気温', key: 'temp', width: 8 },
      { header: '開始', key: 'start', width: 8 },
      { header: '終了', key: 'end', width: 8 },
      { header: '工種・作業内容', key: 'work', width: 40 },
      { header: '人数合計', key: 'workers', width: 10 },
      { header: '安全事項', key: 'safety', width: 30 },
      { header: '備考', key: 'memo', width: 30 },
      { header: 'AI生成', key: 'ai', width: 8 },
      { header: 'ステータス', key: 'status', width: 10 },
      { header: '承認者', key: 'approver', width: 12 },
    ]

    // ヘッダー行スタイル
    const headerRow = ws.getRow(1)
    headerRow.eachCell((cell) => {
      cell.fill = HEADER_FILL
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = {
        top: { style: 'thin' }, bottom: { style: 'thin' },
        left: { style: 'thin' }, right: { style: 'thin' },
      }
    })
    headerRow.height = 22

    for (const r of rows) {
      const cats = r.workCategories as {
        category: string
        description: string
        workerCount: number
      }[]
      const workText = cats.map((c) => `${c.category}（${c.workerCount}名）: ${c.description}`).join('\n')
      const totalWorkers = cats.reduce((sum, c) => sum + (c.workerCount ?? 0), 0)

      const dataRow = ws.addRow({
        date: new Date(r.reportDate).toLocaleDateString('ja-JP', {
          year: 'numeric', month: '2-digit', day: '2-digit',
        }),
        site: r.site.name,
        user: r.user.name ?? '',
        weather: r.weather ?? '',
        temp: r.temperature != null ? `${r.temperature}℃` : '',
        start: r.startTime ? new Date(r.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '',
        end: r.endTime ? new Date(r.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '',
        work: workText,
        workers: totalWorkers || '',
        safety: r.safetyNotes ?? '',
        memo: r.memo ?? '',
        ai: r.aiGenerated ? '○' : '',
        status: STATUS_LABEL[r.status] ?? r.status,
        approver: r.approvedBy?.name ?? '',
      })

      dataRow.getCell('work').alignment = { wrapText: true, vertical: 'top' }
      dataRow.getCell('safety').alignment = { wrapText: true, vertical: 'top' }
      dataRow.getCell('memo').alignment = { wrapText: true, vertical: 'top' }
      dataRow.height = Math.max(18, Math.ceil(workText.split('\n').length * 15))

      // ステータスに応じた色
      const statusCell = dataRow.getCell('status')
      if (r.status === 'APPROVED') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }
        statusCell.font = { color: { argb: 'FF2E7D32' } }
      } else if (r.status === 'REJECTED') {
        statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFEBEE' } }
        statusCell.font = { color: { argb: 'FFC62828' } }
      }

      dataRow.eachCell((cell) => {
        if (!cell.border) {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
            right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
          }
        }
      })
    }

    // 合計行
    if (rows.length > 0) {
      ws.addRow([])
      const totalRow = ws.addRow({
        date: '合計',
        workers: rows.reduce((sum, r) => {
          const cats = r.workCategories as { workerCount: number }[]
          return sum + cats.reduce((s, c) => s + (c.workerCount ?? 0), 0)
        }, 0),
      })
      totalRow.getCell('date').font = { bold: true }
      totalRow.getCell('workers').font = { bold: true }
    }

    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: ws.columnCount },
    }

    return ws
  }

  buildSheet('作業日報（職長）', workDiaries, '職長')
  buildSheet('工事日誌（現場監督）', siteJournals, '現場監督')

  const buffer = await wb.xlsx.writeBuffer()
  const now = new Date()
  const fileDate = now.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-')
  const filename = `日報一覧_${fileDate}.xlsx`

  return new NextResponse(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
    },
  })
}
