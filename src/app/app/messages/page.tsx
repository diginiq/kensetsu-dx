import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ConversationListView } from '@/components/features/messages/ConversationListView'

export default async function MessagesPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const conversations = await prisma.conversation.findMany({
    where: {
      companyId: session.user.companyId ?? '',
      participants: { some: { userId: session.user.id } },
    },
    include: {
      participants: {
        include: { user: { select: { id: true, name: true, role: true } } },
      },
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
    orderBy: { lastMessageAt: 'desc' },
  })

  return (
    <ConversationListView
      conversations={conversations}
      currentUserId={session.user.id}
      basePath="/app/messages"
      newMessageHref="/app/messages/new"
      title="メッセージ"
      showLogo
    />
  )
}
