import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

const UPLOAD_DIR = join(process.cwd(), 'public', 'uploads', 'messages')

export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: params.conversationId,
        userId: session.user.id,
      },
    },
  })
  if (!participant) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) return NextResponse.json({ error: 'ファイルサイズは10MB以下にしてください' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  await mkdir(UPLOAD_DIR, { recursive: true })
  await writeFile(join(UPLOAD_DIR, uniqueName), buffer)

  const fileUrl = `/uploads/messages/${uniqueName}`

  const message = await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      senderId: session.user.id,
      body: file.name,
      fileUrl,
      fileName: file.name,
      fileType: file.type,
    },
    include: { sender: { select: { id: true, name: true } } },
  })

  await prisma.conversation.update({
    where: { id: params.conversationId },
    data: { lastMessageAt: new Date() },
  })

  await prisma.conversationParticipant.updateMany({
    where: { conversationId: params.conversationId, userId: session.user.id },
    data: { lastReadAt: new Date() },
  })

  return NextResponse.json(message)
}
