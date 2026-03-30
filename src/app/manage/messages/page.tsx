import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { MessageSquarePlus } from 'lucide-react'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ConversationListView } from '@/components/features/messages/ConversationListView'

export default async function ManageMessagesPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const conversations = await prisma.conversation.findMany({
    where: {
      companyId: session.user.companyId,
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
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">社内メッセージ</h1>
        <Link
          href="/manage/messages/new"
          className="inline-flex items-center gap-1 min-h-touch text-sm font-medium rounded-lg px-4 py-2 text-white"
          style={{ backgroundColor: '#E85D04' }}
        >
          <MessageSquarePlus size={16} />
          新規
        </Link>
      </div>
      <ConversationListView
        embedded
        conversations={conversations}
        currentUserId={session.user.id}
        basePath="/manage/messages"
        newMessageHref="/manage/messages/new"
        title="社内メッセージ"
        showLogo={false}
      />
    </div>
  )
}
