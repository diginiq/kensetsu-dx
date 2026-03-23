import { createA4Doc, drawHeader, drawField, collectPdfBuffer } from '../generator'

interface DocumentInput {
  title: string
  company: { name: string; address: string | null; phone: string | null; constructionLicense: string | null }
  site: { name: string }
}

export async function generateSubcontractNotification(
  document: DocumentInput,
  data: Record<string, unknown>
): Promise<Buffer> {
  const doc = createA4Doc()
  const bufferPromise = collectPdfBuffer(doc)

  drawHeader(doc, 'Subcontract Notification / Sai-Shitauke Tsuchisho', 'Form No.1')

  const x = 40
  let y = 100

  doc.rect(x, y, 515, 180).stroke()

  drawField(doc, 'Prime Contractor / Motouke', document.company.name, x + 10, y + 10, 240)
  drawField(doc, 'Address', document.company.address ?? '-', x + 10, y + 35, 240)
  drawField(doc, 'Phone', document.company.phone ?? '-', x + 10, y + 60, 240)
  drawField(doc, 'License No.', document.company.constructionLicense ?? '-', x + 260, y + 10, 240)

  drawField(doc, 'Site', document.site.name, x + 260, y + 35, 240)
  drawField(doc, 'Construction Name', (data.constructionName as string) ?? '-', x + 10, y + 90, 240)

  const periodFrom = (data.periodFrom as string) ?? '-'
  const periodTo = (data.periodTo as string) ?? '-'
  drawField(doc, 'Period', `${periodFrom} - ${periodTo}`, x + 260, y + 90, 240)

  drawField(doc, 'Contract Amount', (data.contractAmount as string) ?? '-', x + 10, y + 120, 240)

  y += 200

  doc.rect(x, y, 515, 120).stroke()
  doc.fontSize(9).text('Subcontractor Information', x + 10, y + 10)

  drawField(doc, 'Company', (data.subcontractorName as string) ?? (data.companyName as string) ?? '-', x + 10, y + 30, 240)
  drawField(doc, 'Address', (data.subcontractorAddress as string) ?? (data.companyAddress as string) ?? '-', x + 10, y + 55, 240)
  drawField(doc, 'Phone', (data.subcontractorPhone as string) ?? (data.companyPhone as string) ?? '-', x + 260, y + 30, 240)
  drawField(doc, 'License', (data.subcontractorLicense as string) ?? (data.constructionLicense as string) ?? '-', x + 260, y + 55, 240)

  y += 140

  if (data.remarks) {
    doc.fontSize(8).text('Remarks:', x, y)
    doc.fontSize(9).text(data.remarks as string, x, y + 12, { width: 515 })
  }

  y += 60
  doc.fontSize(8).text(`Date: ${new Date().toLocaleDateString('ja-JP')}`, x, y)

  doc.end()
  return bufferPromise
}
