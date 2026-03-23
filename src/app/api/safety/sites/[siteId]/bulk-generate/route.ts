import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateSafetyPdf } from '@/lib/pdf/generator'

export async function POST(_req: Request, { params }: { params: { siteId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const documents = await prisma.safetyDocument.findMany({
    where: { siteId: params.siteId, companyId: session.user.companyId },
    include: { site: true, company: true },
  })

  if (documents.length === 0) {
    return NextResponse.json({ error: '書類がありません' }, { status: 400 })
  }

  const results: { id: string; title: string; success: boolean; error?: string }[] = []

  for (const doc of documents) {
    try {
      await generateSafetyPdf(doc)
      await prisma.safetyDocument.update({
        where: { id: doc.id },
        data: { generatedPdfKey: `safety/${doc.companyId}/${doc.siteId}/${doc.id}.pdf` },
      })
      results.push({ id: doc.id, title: doc.title, success: true })
    } catch (error) {
      results.push({
        id: doc.id,
        title: doc.title,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({ results, total: documents.length, success: results.filter(r => r.success).length })
}
