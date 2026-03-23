import { createA4Doc, drawHeader, drawTableHeader, drawTableRow, collectPdfBuffer } from '../generator'

interface EquipmentData {
  name: string
  model?: string
  manufacturer?: string
  serialNumber?: string
  inspectionDate?: string
  nextInspection?: string
}

interface DocumentInput {
  title: string
  company: { name: string; address: string | null; phone: string | null }
  site: { name: string }
}

export async function generateEquipmentEntry(
  document: DocumentInput,
  data: Record<string, unknown>
): Promise<Buffer> {
  const doc = createA4Doc()
  const bufferPromise = collectPdfBuffer(doc)
  const equipment = (data.equipment as EquipmentData[]) ?? []

  drawHeader(doc, 'Equipment Entry Notice / Mochikomi Kikai Todoke', 'Form No.11')

  doc.fontSize(9)
  doc.text(`Company: ${document.company.name}`)
  doc.text(`Site: ${document.site.name}`)
  doc.text(`Date: ${new Date().toLocaleDateString('ja-JP')}`)
  doc.moveDown()

  const colWidths = [30, 90, 70, 70, 70, 80, 80]
  const headers = ['No.', 'Name', 'Model', 'Maker', 'Serial No.', 'Last Insp.', 'Next Insp.']
  let y = drawTableHeader(doc, headers, 40, doc.y, colWidths)

  equipment.forEach((eq, i) => {
    if (y > 760) {
      doc.addPage()
      y = 40
      y = drawTableHeader(doc, headers, 40, y, colWidths)
    }

    const lastInsp = eq.inspectionDate
      ? new Date(eq.inspectionDate).toLocaleDateString('ja-JP')
      : '-'
    const nextInsp = eq.nextInspection
      ? new Date(eq.nextInspection).toLocaleDateString('ja-JP')
      : '-'

    y = drawTableRow(doc, [
      String(i + 1),
      eq.name,
      eq.model ?? '-',
      eq.manufacturer ?? '-',
      eq.serialNumber ?? '-',
      lastInsp,
      nextInsp,
    ], 40, y, colWidths)
  })

  doc.moveDown(2)
  doc.fontSize(8)
  doc.text(`Total: ${equipment.length} items`)

  if (data.remarks) {
    doc.moveDown()
    doc.text(`Remarks: ${data.remarks as string}`)
  }

  doc.end()
  return bufferPromise
}
