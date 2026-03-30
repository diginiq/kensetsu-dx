import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resolveMessageAttachmentUrl } from '@/lib/storage'
import { notifyOnNewMessage } from '@/lib/notifyOnNewMessage'

export async function POST(
  req: Request,
  { params }: { params: { conversationId: string } },
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '未認証' }, { status: 401 })
  if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const participant = await prisma.conversationParticipant.findUnique({
    where: {
      conversationId_userId: {
        conversationId: params.conversationId,
        userId: session.user.id,
      },
    },
  })
  if (!participant) return NextResponse.json({ error: '権限がありません' }, { status: 403 })

  const conv = await prisma.conversation.findFirst({
    where: { id: params.conversationId, companyId: session.user.companyId },
  })
  if (!conv) return NextResponse.json({ error: '会話が見つかりません' }, { status: 404 })

  const { photoId } = (await req.json()) as { photoId?: string }
  if (!photoId) return NextResponse.json({ error: 'photoId が必要です' }, { status: 400 })

  const photo = await prisma.photo.findFirst({
    where: {
      id: photoId,
      site: { companyId: session.user.companyId },
    },
    select: { id: true, s3Key: true, fileName: true, mimeType: true },
  })
  if (!photo) return NextResponse.json({ error: '写真が見つかりません' }, { status: 404 })

  const message = await prisma.message.create({
    data: {
      conversationId: params.conversationId,
      senderId: session.user.id,
      body: `📷 現場写真: ${photo.fileName}`,
      fileUrl: photo.s3Key,
      fileName: photo.fileName,
      fileType: photo.mimeType,
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
