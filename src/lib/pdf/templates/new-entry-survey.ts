import { createA4Doc, drawHeader, drawField, collectPdfBuffer } from '../generator'

interface WorkerData {
  name: string
  phone?: string
  address?: string
  bloodType?: string
  emergencyName?: string
  emergencyPhone?: string
  emergencyRelation?: string
  healthInsuranceType?: string
  specialMedicalCheck?: boolean
  lastMedicalCheckDate?: string
  qualifications?: Array<{ name: string; category: string }>
}

interface DocumentInput {
  title: string
  company: { name: string; address: string | null; phone: string | null }
  site: { name: string }
}

export async function generateNewEntrySurvey(
  document: DocumentInput,
  data: Record<string, unknown>
): Promise<Buffer> {
  const doc = createA4Doc()
  const bufferPromise = collectPdfBuffer(doc)
  const workers = (data.workers as WorkerData[]) ?? []

  for (let i = 0; i < workers.length; i++) {
    if (i > 0) doc.addPage()

    const w = workers[i]

    drawHeader(doc, 'New Entry Survey / Shinki Nyuujousha Chousahyou', 'Form No.7')

    const x = 40
    let y = 90

    doc.fontSize(9)
    doc.text(`Company: ${document.company.name}`, x, y)
    doc.text(`Site: ${document.site.name}`, x, y + 14)
    doc.text(`Date: ${new Date().toLocaleDateString('ja-JP')}`, x, y + 28)
    y += 50

    doc.rect(x, y, 515, 200).stroke()
    doc.fontSize(10).text('Worker Information', x + 10, y + 5)

    drawField(doc, 'Name', w.name, x + 10, y + 25, 240)
    drawField(doc, 'Phone', w.phone ?? '-', x + 260, y + 25, 240)
    drawField(doc, 'Address', w.address ?? '-', x + 10, y + 50, 490)
    drawField(doc, 'Blood Type', w.bloodType ?? '-', x + 10, y + 75, 120)
    drawField(doc, 'Health Insurance', w.healthInsuranceType ?? '-', x + 140, y + 75, 120)
    drawField(doc, 'Medical Check', w.lastMedicalCheckDate ? new Date(w.lastMedicalCheckDate).toLocaleDateString('ja-JP') : '-', x + 260, y + 75, 120)
    drawField(doc, 'Special Medical', w.specialMedicalCheck ? 'Yes' : 'No', x + 390, y + 75, 100)

    doc.fontSize(9).text('Emergency Contact', x + 10, y + 105)
    drawField(doc, 'Name', w.emergencyName ?? '-', x + 10, y + 120, 160)
    drawField(doc, 'Phone', w.emergencyPhone ?? '-', x + 180, y + 120, 160)
    drawField(doc, 'Relationship', w.emergencyRelation ?? '-', x + 350, y + 120, 150)

    y += 210

    if (w.qualifications && w.qualifications.length > 0) {
      doc.rect(x, y, 515, 20 + w.qualifications.length * 16).stroke()
      doc.fontSize(9).text('Qualifications', x + 10, y + 5)
      y += 20
      w.qualifications.forEach((q) => {
        doc.fontSize(8).text(`${q.category}: ${q.name}`, x + 10, y + 2)
        y += 16
      })
    }
  }

  if (workers.length === 0) {
    drawHeader(doc, 'New Entry Survey / Shinki Nyuujousha Chousahyou', 'Form No.7')
    doc.fontSize(10).text('No workers selected.', 40, 100)
  }

  doc.end()
  return bufferPromise
}
