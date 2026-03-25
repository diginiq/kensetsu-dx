import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ChatView } from './ChatView'

export default async function ConversationPage({ params }: { params: { conversationId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.conversationId, userId: session.user.id } },
  })
  if (!participant) redirect('/app/messages')

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId },
    include: {
      participants: { include: { user: { select: { id: true, name: true, role: true } } } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  })
  if (!conversation) redirect('/app/messages')

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  })

  const readStatus: Record<string, string> = {}
  for (const p of conversation.participants) {
    readStatus[p.userId] = p.lastReadAt.toISOString()
  }

  return (
    <ChatView
      conversationId={conversation.id}
      subject={conversation.subject}
      currentUserId={session.user.id}
      participants={conversation.participants.map((p) => p.user)}
      initialMessages={conversation.messages.map((m) => ({
        id: m.id,
        body: m.body,
        senderId: m.sender.id,
        senderName: m.sender.name,
        createdAt: m.createdAt.toISOString(),
        fileUrl: m.fileUrl,
        fileName: m.fileName,
        fileType: m.fileType,
      }))}
      readStatus={readStatus}
    />
  )
}
