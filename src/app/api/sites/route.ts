import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { siteSchema } from '@/lib/validations/site'

export async function GET(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const statusParam = searchParams.get('status')

  // ARCHIVEDは常に除外。statusパラメータがあれば絞り込む
  const where =
    statusParam && statusParam !== 'ALL'
      ? { companyId: session.user.companyId, status: statusParam as 'ACTIVE' | 'COMPLETED' | 'PLANNING' | 'SUSPENDED' }
      : { companyId: session.user.companyId, status: { not: 'ARCHIVED' as const } }

  const sites = await prisma.site.findMany({
    where,
    include: {
      _count: { select: { photos: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return NextResponse.json(sites)
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: '認証が必要です' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が正しくありません' }, { status: 400 })
  }

  const result = siteSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json(
      { error: '入力内容に誤りがあります', details: result.error.flatten() },
      { status: 400 },
    )
  }

  const { startDate, endDate, ...rest } = result.data

  const site = await prisma.site.create({
    data: {
      ...rest,
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      status: 'ACTIVE',
      companyId: session.user.companyId,
    },
  })

  return NextResponse.json(site, { status: 201 })
}
