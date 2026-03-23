import { createA4Doc, drawHeader, drawTableHeader, drawTableRow, collectPdfBuffer } from '../generator'

interface WorkerData {
  name: string
  bloodType?: string
  address?: string
  healthInsuranceType?: string
  pensionType?: string
  employmentInsuranceNo?: string
  lastMedicalCheckDate?: string
  qualifications?: Array<{ name: string; certNumber?: string; expiresDate?: string }>
}

interface DocumentInput {
  title: string
  company: { name: string; address: string | null; phone: string | null }
  site: { name: string }
}

export async function generateWorkerRoster(
  document: DocumentInput,
  data: Record<string, unknown>
): Promise<Buffer> {
  const doc = createA4Doc()
  const bufferPromise = collectPdfBuffer(doc)
  const workers = (data.workers as WorkerData[]) ?? []

  drawHeader(doc, 'Worker Roster / Sakugyouin Meibo', 'Form No.2')

  doc.fontSize(9)
  doc.text(`Company: ${document.company.name}`)
  doc.text(`Site: ${document.site.name}`)
  doc.text(`Date: ${new Date().toLocaleDateString('ja-JP')}`)
  doc.moveDown()

  const colWidths = [30, 80, 40, 80, 60, 60, 60, 60]
  const headers = ['No.', 'Name', 'Blood', 'Address', 'Health Ins.', 'Pension', 'Emp. Ins.', 'Medical']
  let y = drawTableHeader(doc, headers, 40, doc.y, colWidths)

  workers.forEach((w, i) => {
    if (y > 760) {
      doc.addPage()
      y = 40
      y = drawTableHeader(doc, headers, 40, y, colWidths)
    }

    const medicalDate = w.lastMedicalCheckDate
      ? new Date(w.lastMedicalCheckDate).toLocaleDateString('ja-JP')
      : '-'

    y = drawTableRow(doc, [
      String(i + 1),
      w.name,
      w.bloodType ?? '-',
      w.address ?? '-',
      w.healthInsuranceType ?? '-',
      w.pensionType ?? '-',
      w.employmentInsuranceNo ?? '-',
      medicalDate,
    ], 40, y, colWidths)

    if (w.qualifications && w.qualifications.length > 0) {
      const qualText = w.qualifications.map((q) => q.name).join(', ')
      const qualColWidths = [30, 440]
      y = drawTableRow(doc, ['', `Qualifications: ${qualText}`], 40, y, qualColWidths)
    }
  })

  doc.moveDown(2)
  doc.fontSize(8)
  doc.text(`Total: ${workers.length} workers`)

  doc.end()
  return bufferPromise
}
