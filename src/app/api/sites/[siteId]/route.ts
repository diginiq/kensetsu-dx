import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { siteUpdateSchema } from '@/lib/validations/site'

type Params = { params: { siteId: string } }

// 自社の現場か確認（ARCHIVEDも含む）
async function findSite(siteId: string, companyId: string) {
  return prisma.site.findFirst({
    where: { id: siteId, companyId },
  })
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  if (!session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    include: { _count: { select: { photos: true } } },
  })

  if (!site) {
    return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })
  }

  return NextResponse.json(site)
}

export async function PUT(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  if (!session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const site = await findSite(params.siteId, session.user.companyId)
  if (!site || site.status === 'ARCHIVED') {
    return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const result = siteUpdateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: '入力内容に誤りがあります', details: result.error.flatten() },
      { status: 400 },
    )
  }

  const { startDate, endDate, ...rest } = result.data

  const updated = await prisma.site.update({
    where: { id: params.siteId },
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }
  if (!session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const site = await findSite(params.siteId, session.user.companyId)
  if (!site || site.status === 'ARCHIVED') {
    return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })
  }

  // 論理削除（ARCHIVED）
  await prisma.site.update({
    where: { id: params.siteId },
    data: { status: 'ARCHIVED' },
  })

  return NextResponse.json({ message: '現場を削除しました' })
}
