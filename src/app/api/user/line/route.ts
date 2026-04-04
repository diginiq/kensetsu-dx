import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const { lineUserId } = await req.json()

  // LINE User IDの簡易バリデーション（U + 32文字英数字）
  if (lineUserId !== null && lineUserId !== undefined) {
    if (typeof lineUserId !== 'string') {
      return NextResponse.json({ error: '無効な値です' }, { status: 400 })
    }
    if (lineUserId.length > 0 && !/^U[a-f0-9]{32}$/.test(lineUserId)) {
      return NextResponse.json({ error: 'LINE User IDの形式が正しくありません（U + 32文字）' }, { status: 400 })
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { lineUserId: lineUserId || null },
  })

  return NextResponse.json({ ok: true })
}
