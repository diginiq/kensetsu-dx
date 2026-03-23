import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateSafetyPdf } from '@/lib/pdf/generator'

export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const doc = await prisma.safetyDocument.findFirst({
    where: { id: params.id, companyId: session.user.companyId },
    include: {
      site: true,
      company: true,
    },
  })
  if (!doc) return NextResponse.json({ error: '書類が見つかりません' }, { status: 404 })

  try {
    const pdfBuffer = await generateSafetyPdf(doc)

    await prisma.safetyDocument.update({
      where: { id: params.id },
      data: { generatedPdfKey: `safety/${doc.companyId}/${doc.siteId}/${doc.id}.pdf` },
    })

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.title)}.pdf"`,
      },
    })
  } catch (error) {
    console.error('PDF生成エラー:', error)
    return NextResponse.json({ error: 'PDF生成に失敗しました' }, { status: 500 })
  }
}
