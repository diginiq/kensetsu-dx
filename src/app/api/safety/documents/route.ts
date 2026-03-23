import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const siteId = searchParams.get('siteId')
  const status = searchParams.get('status')
  const documentType = searchParams.get('documentType')

  const documents = await prisma.safetyDocument.findMany({
    where: {
      companyId: session.user.companyId,
      ...(siteId ? { siteId } : {}),
      ...(status ? { status: status as 'DRAFT' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' } : {}),
      ...(documentType ? { documentType: documentType as never } : {}),
    },
    include: {
      site: { select: { id: true, name: true } },
    },
    orderBy: { updatedAt: 'desc' },
    take: 100,
  })

  return NextResponse.json(documents)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const body = await req.json()
  const { siteId, documentType, title, data } = body

  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const doc = await prisma.safetyDocument.create({
    data: {
      companyId: session.user.companyId,
      siteId,
      documentType,
      title,
      data: data ?? {},
    },
  })

  return NextResponse.json(doc, { status: 201 })
}
