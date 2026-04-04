import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { language } = await req.json()
  if (!['ja', 'en', 'vi', 'id'].includes(language)) {
    return NextResponse.json({ error: '無効な言語コード' }, { status: 400 })
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { language },
  })

  return NextResponse.json({ ok: true })
}
