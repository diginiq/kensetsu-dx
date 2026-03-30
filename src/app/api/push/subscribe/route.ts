import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type Body = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const body = (await req.json()) as Body
  if (!body?.endpoint || !body.keys?.p256dh || !body.keys?.auth) {
    return NextResponse.json({ error: '購読情報が不正です' }, { status: 400 })
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: body.endpoint },
    create: {
      userId: session.user.id,
      endpoint: body.endpoint,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
    update: {
      userId: session.user.id,
      p256dh: body.keys.p256dh,
      auth: body.keys.auth,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const { endpoint } = (await req.json()) as { endpoint?: string }
  if (!endpoint) return NextResponse.json({ error: 'endpoint が必要です' }, { status: 400 })

  await prisma.pushSubscription.deleteMany({
    where: { userId: session.user.id, endpoint },
  })

  return NextResponse.json({ ok: true })
}
