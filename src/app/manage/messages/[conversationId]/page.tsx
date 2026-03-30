import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { resolveMessageAttachmentUrl } from '@/lib/storage'
import { ChatView } from '@/components/features/messages/ChatView'

export default async function ManageConversationPage({ params }: { params: { conversationId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId: params.conversationId, userId: session.user.id } },
  })
  if (!participant) redirect('/manage/messages')

  const conversation = await prisma.conversation.findUnique({
    where: { id: params.conversationId, companyId: session.user.companyId },
    include: {
      participants: { include: { user: { select: { id: true, name: true, role: true } } } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: { sender: { select: { id: true, name: true } } },
      },
    },
  })
  if (!conversation) redirect('/manage/messages')

  await prisma.conversationParticipant.update({
    where: { id: participant.id },
    data: { lastReadAt: new Date() },
  })

  const readStatus: Record<string, string> = {}
  for (const p of conversation.participants) {
    readStatus[p.userId] = p.lastReadAt.toISOString()
  }

  const initialMessages = await Promise.all(
    conversation.messages.map(async (m) => ({
      id: m.id,
      body: m.body,
      senderId: m.sender.id,
      senderName: m.sender.name,
      createdAt: m.createdAt.toISOString(),
      fileUrl: m.fileUrl,
      fileAccessUrl: await resolveMessageAttachmentUrl(m.fileUrl),
      fileName: m.fileName,
      fileType: m.fileType,
    })),
  )

  return (
    <div className="max-w-3xl mx-auto -mx-4 -my-6 min-h-[calc(100vh-3.5rem)]">
      <ChatView
        conversationId={conversation.id}
        subject={conversation.subject}
        currentUserId={session.user.id}
        participants={conversation.participants.map((p) => p.user)}
        initialMessages={initialMessages}
        readStatus={readStatus}
        listHref="/manage/messages"
      />
    </div>
  )
}
