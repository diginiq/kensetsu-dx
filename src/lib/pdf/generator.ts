import PDFDocument from 'pdfkit'
import { generateWorkerRoster } from './templates/worker-roster'
import { generateSubcontractNotification } from './templates/subcontract-notification'
import { generateNewEntrySurvey } from './templates/new-entry-survey'
import { generateEquipmentEntry } from './templates/equipment-entry'

interface SafetyDocumentInput {
  id: string
  documentType: string
  title: string
  data: unknown
  company: { name: string; address: string | null; phone: string | null; constructionLicense: string | null }
  site: { name: string; address: string | null }
}

const A4_WIDTH = 595.28
const A4_HEIGHT = 841.89
const MARGIN = 40

export function createA4Doc(): typeof PDFDocument.prototype {
  return new PDFDocument({
    size: 'A4',
    margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
    info: { Title: '安全書類', Producer: '建設DX' },
  })
}

export function drawHeader(doc: typeof PDFDocument.prototype, title: string, formNumber: string) {
  doc.fontSize(16).text(title, MARGIN, MARGIN, { align: 'center', width: A4_WIDTH - MARGIN * 2 })
  doc.fontSize(8).text(formNumber, MARGIN, MARGIN + 20, { align: 'right', width: A4_WIDTH - MARGIN * 2 })
  doc.moveDown(1.5)
}

export function drawField(doc: typeof PDFDocument.prototype, label: string, value: string, x: number, y: number, width: number) {
  doc.fontSize(7).text(label, x, y, { width })
  doc.fontSize(9).text(value || '-', x, y + 10, { width })
}

export function drawTableHeader(doc: typeof PDFDocument.prototype, headers: string[], x: number, y: number, colWidths: number[]) {
  let cx = x
  doc.fontSize(7)
  headers.forEach((h, i) => {
    doc.rect(cx, y, colWidths[i], 18).stroke()
    doc.text(h, cx + 2, y + 4, { width: colWidths[i] - 4 })
    cx += colWidths[i]
  })
  return y + 18
}

export function drawTableRow(doc: typeof PDFDocument.prototype, cells: string[], x: number, y: number, colWidths: number[], rowHeight = 16) {
  let cx = x
  doc.fontSize(7)
  cells.forEach((cell, i) => {
    doc.rect(cx, y, colWidths[i], rowHeight).stroke()
    doc.text(cell || '-', cx + 2, y + 3, { width: colWidths[i] - 4 })
    cx += colWidths[i]
  })
  return y + rowHeight
}

function collectPdfBuffer(doc: typeof PDFDocument.prototype): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    doc.on('data', (chunk: Buffer) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
  })
}

export async function generateSafetyPdf(document: SafetyDocumentInput): Promise<Buffer> {
  const data = document.data as Record<string, unknown>

  switch (document.documentType) {
    case 'WORKER_ROSTER':
      return generateWorkerRoster(document, data)
    case 'SUBCONTRACT_NOTIFICATION':
      return generateSubcontractNotification(document, data)
    case 'NEW_ENTRY_SURVEY':
      return generateNewEntrySurvey(document, data)
    case 'EQUIPMENT_ENTRY':
      return generateEquipmentEntry(document, data)
    default:
      return generateGenericDocument(document, data)
  }
}

async function generateGenericDocument(
  document: SafetyDocumentInput,
  data: Record<string, unknown>
): Promise<Buffer> {
  const doc = createA4Doc()
  const bufferPromise = collectPdfBuffer(doc)

  drawHeader(doc, document.title, '')

  doc.fontSize(10)
  doc.text(`Company: ${document.company.name}`)
  doc.text(`Site: ${document.site.name}`)
  doc.moveDown()

  const entries = Object.entries(data).filter(([k]) => !['workers', 'equipment'].includes(k))
  for (const [key, value] of entries) {
    if (value !== null && value !== undefined && typeof value !== 'object') {
      doc.fontSize(8).text(`${key}: ${String(value)}`)
    }
  }

  doc.end()
  return bufferPromise
}

export { collectPdfBuffer }
