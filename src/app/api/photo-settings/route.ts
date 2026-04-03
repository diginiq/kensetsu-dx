import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const updateSchema = z.object({
  resolution: z.enum(['1024', '2048', '4096']),
  jpegQuality: z.number().int().min(50).max(100),
  storageLimitGb: z.number().min(1).max(1000),
  autoOrganize: z.boolean(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const settings = await prisma.photoSettings.findUnique({
    where: { companyId: session.user.companyId },
  })

  return NextResponse.json({
    resolution: settings?.resolution ?? '2048',
    jpegQuality: settings?.jpegQuality ?? 85,
    storageLimitGb: settings?.storageLimitGb ?? 10,
    autoOrganize: settings?.autoOrganize ?? true,
  })
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }
  if (session.user.role !== 'COMPANY_ADMIN' && session.user.role !== 'SUPER_ADMIN') {
    return NextResponse.json({ error: '管理者のみ変更できます' }, { status: 403 })
  }

  const body = await req.json()
  const result = updateSchema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: '入力値が不正です', details: result.error.format() }, { status: 400 })
  }

  const settings = await prisma.photoSettings.upsert({
    where: { companyId: session.user.companyId },
    update: result.data,
    create: { companyId: session.user.companyId, ...result.data },
  })

  return NextResponse.json(settings)
}
