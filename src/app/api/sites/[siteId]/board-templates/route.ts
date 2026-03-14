import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 現場のボードテンプレート一覧取得
export async function GET(
  _req: Request,
  { params }: { params: { siteId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId, status: { not: 'ARCHIVED' } },
    select: { id: true },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const templates = await prisma.boardTemplate.findMany({
    where: { siteId: params.siteId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  })
  return NextResponse.json(templates)
}

// テンプレート新規作成
export async function POST(
  req: Request,
  { params }: { params: { siteId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId, status: { not: 'ARCHIVED' } },
    select: { id: true },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const { name, backgroundColor, textColor, defaultWorkType, isDefault, layout } = body

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'テンプレート名を入力してください' }, { status: 400 })
  }

  // デフォルト設定時は他のデフォルトを解除
  if (isDefault) {
    await prisma.boardTemplate.updateMany({
      where: { siteId: params.siteId },
      data: { isDefault: false },
    })
  }

  const template = await prisma.boardTemplate.create({
    data: {
      siteId: params.siteId,
      name: name as string,
      layout: (layout as object) ?? {},
      backgroundColor: (backgroundColor as string) ?? '#2D5016',
      textColor: (textColor as string) ?? '#FFFFFF',
      defaultWorkType: (defaultWorkType as string) ?? null,
      isDefault: Boolean(isDefault),
    },
  })

  return NextResponse.json(template, { status: 201 })
}
