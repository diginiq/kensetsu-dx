import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

// テンプレート更新
export async function PUT(
  req: Request,
  { params }: { params: { siteId: string; templateId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const template = await prisma.boardTemplate.findFirst({
    where: {
      id: params.templateId,
      siteId: params.siteId,
      site: { companyId: session.user.companyId },
    },
  })
  if (!template) return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const { name, backgroundColor, textColor, defaultWorkType, isDefault, layout } = body

  if (name !== undefined && (typeof name !== 'string' || !name.trim())) {
    return NextResponse.json({ error: 'テンプレート名を入力してください' }, { status: 400 })
  }

  // デフォルト設定時は他のデフォルトを解除
  if (isDefault) {
    await prisma.boardTemplate.updateMany({
      where: { siteId: params.siteId, id: { not: params.templateId } },
      data: { isDefault: false },
    })
  }

  const updated = await prisma.boardTemplate.update({
    where: { id: params.templateId },
    data: {
      ...(name !== undefined && { name: name as string }),
      ...(backgroundColor !== undefined && { backgroundColor: backgroundColor as string }),
      ...(textColor !== undefined && { textColor: textColor as string }),
      ...(defaultWorkType !== undefined && { defaultWorkType: (defaultWorkType as string) || null }),
      ...(isDefault !== undefined && { isDefault: Boolean(isDefault) }),
      ...(layout !== undefined && { layout: layout as object }),
    },
  })

  return NextResponse.json(updated)
}

// テンプレート削除
export async function DELETE(
  _req: Request,
  { params }: { params: { siteId: string; templateId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const template = await prisma.boardTemplate.findFirst({
    where: {
      id: params.templateId,
      siteId: params.siteId,
      site: { companyId: session.user.companyId },
    },
  })
  if (!template) return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 })

  await prisma.boardTemplate.delete({ where: { id: params.templateId } })
  return NextResponse.json({ ok: true })
}
