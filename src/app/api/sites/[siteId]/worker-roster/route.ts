import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
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

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    include: {
      company: { select: { name: true, address: true, phone: true, constructionLicense: true } },
      assignments: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              workerProfile: true,
              workerQualifications: {
                where: { expiresDate: { gt: new Date() } },
                orderBy: { createdAt: 'asc' },
              },
            },
          },
        },
      },
    },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const fontPath = path.join(process.cwd(), 'public', 'fonts', 'NotoSansJP-Regular.ttf')
  const hasFallback = fs.existsSync(fontPath)

  const doc = new PDFDocument({ size: 'A4', margin: 40, bufferPages: true })
  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))

  if (hasFallback) doc.registerFont('NotoSans', fontPath)
  const font = hasFallback ? 'NotoSans' : 'Helvetica'

  // ヘッダー
  doc.rect(0, 0, doc.page.width, 80).fill(SECONDARY)
  doc.fillColor('white').font(font).fontSize(18).text('作業員名簿', 40, 16)
  doc.fontSize(9).text(`現場名: ${site.name}`, 40, 42)
  doc.text(`作成日: ${new Date().toLocaleDateString('ja-JP')}`, 40, 56)
  doc.text(`${site.company.name}`, doc.page.width - 40, 42, { align: 'right', width: doc.page.width - 80 })
  if (site.company.constructionLicense) {
    doc.text(`建設業許可 ${site.company.constructionLicense}`, doc.page.width - 40, 56, { align: 'right', width: doc.page.width - 80 })
  }

  let y = 95

  // テーブルヘッダー
  const tableLeft = 40
  const colWidths = [130, 80, 90, 80, 175]
  const headers = ['氏名', '血液型', '保険', '健康診断', '保有資格']

  doc.rect(tableLeft, y, doc.page.width - 80, 18).fill(SECONDARY)
  let x = tableLeft
  headers.forEach((h, i) => {
    doc.fillColor('white').fontSize(8).font(font)
      .text(h, x + 4, y + 5, { width: colWidths[i] - 8 })
    x += colWidths[i]
  })
  y += 18

  for (const assignment of site.assignments) {
    const w = assignment.user
    const p = w.workerProfile

    if (y > doc.page.height - 60) {
      doc.addPage()
      y = 40
    }

    const rowH = Math.max(20, 10 + (w.workerQualifications.length * 10))
    doc.rect(tableLeft, y, doc.page.width - 80, rowH).fill('#F9F9F9').stroke('#E0E0E0')

    const bloodLabel = p?.bloodType === 'UNKNOWN' ? '不明' : p?.bloodType ?? '-'
    const insuranceLabel = p ? [
      p.healthInsuranceType ? `健保: ${p.healthInsuranceType}` : null,
      p.pensionType ? `年金: ${p.pensionType}` : null,
    ].filter(Boolean).join(' / ') || '-' : '-'
    const medicalLabel = p?.lastMedicalCheckDate
      ? new Date(p.lastMedicalCheckDate).toLocaleDateString('ja-JP', { year: '2-digit', month: 'short' })
      : '-'
    const qualLabel = w.workerQualifications.length > 0
      ? w.workerQualifications.map((q) => q.name).join('\n')
      : '-'

    const rowData = [
      { text: `${w.name}\n${w.phone ?? ''}`, color: '#333' },
      { text: bloodLabel, color: '#555' },
      { text: insuranceLabel, color: '#555' },
      { text: medicalLabel, color: '#555' },
      { text: qualLabel, color: '#444' },
    ]

    x = tableLeft
    rowData.forEach((cell, i) => {
      doc.fillColor(cell.color).fontSize(7.5).font(font)
        .text(cell.text, x + 4, y + 4, { width: colWidths[i] - 8, lineGap: 1 })
      x += colWidths[i]
    })
    y += rowH
  }

  if (site.assignments.length === 0) {
    doc.fillColor('#aaa').font(font).fontSize(10)
      .text('担当ワーカーが登録されていません', tableLeft, y + 10)
  }

  // 署名欄
  y += 20
  doc.moveTo(tableLeft, y).lineTo(doc.page.width - 40, y).stroke('#E0E0E0')
  y += 10
  doc.fillColor('#666').fontSize(8).font(font)
    .text('作成者署名:', tableLeft, y)
    .text('確認者署名:', tableLeft + 230, y)
  y += 24
  doc.moveTo(tableLeft, y).lineTo(tableLeft + 180, y).stroke('#555')
  doc.moveTo(tableLeft + 230, y).lineTo(tableLeft + 410, y).stroke('#555')

  doc.end()
  const pdf = await new Promise<Buffer>((resolve) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)))
  })

  const filename = encodeURIComponent(`作業員名簿_${site.name}.pdf`)
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
