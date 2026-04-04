import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'パスワードは8文字以上で入力してください'),
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: result.error.issues[0]?.message ?? '入力が不正です' }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true },
  })
  if (!user) return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })

  const isValid = await bcrypt.compare(result.data.currentPassword, user.passwordHash)
  if (!isValid) {
    return NextResponse.json({ error: '現在のパスワードが正しくありません' }, { status: 400 })
  }

  const newHash = await bcrypt.hash(result.data.newPassword, 12)
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: newHash },
  })

  return NextResponse.json({ ok: true })
}
