import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NewMessageForm } from '@/components/features/messages/NewMessageForm'

export default async function ManageNewMessagePage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const companyUsers = await prisma.user.findMany({
    where: {
      companyId: session.user.companyId,
      isActive: true,
      id: { not: session.user.id },
    },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return (
    <div className="max-w-3xl mx-auto -mx-4 -my-6">
      <NewMessageForm users={companyUsers} messagesBasePath="/manage/messages" />
    </div>
  )
}
