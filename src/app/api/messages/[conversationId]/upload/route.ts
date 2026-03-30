import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadFile, resolveMessageAttachmentUrl } from '@/lib/storage'
import { notifyOnNewMessage } from '@/lib/notifyOnNewMessage'

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

  const conv = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
    select: { companyId: true },
  })
  if (!conv) return NextResponse.json({ error: '会話が見つかりません' }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })

  const maxSize = 10 * 1024 * 1024
  if (file.size > maxSize) return NextResponse.json({ error: 'ファイルサイズは10MB以下にしてください' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'bin'
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  const key = `messages/${conv.companyId}/${params.conversationId}/${uniqueName}`

  const { s3Key } = await uploadFile(buffer, key, file.type || 'application/octet-stream')

  const message = await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      senderId: session.user.id,
      body: file.name,
      fileUrl: s3Key,
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

  await notifyOnNewMessage(message.id).catch(() => {})

  const fileAccessUrl = await resolveMessageAttachmentUrl(message.fileUrl)
  return NextResponse.json({ ...message, fileAccessUrl })
}
