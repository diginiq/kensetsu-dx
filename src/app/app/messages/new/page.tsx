import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NewMessageForm } from './NewMessageForm'

export default async function NewMessagePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!session.user.companyId) redirect('/app/messages')

  const companyUsers = await prisma.user.findMany({
    where: {
      companyId: session.user.companyId,
      isActive: true,
      id: { not: session.user.id },
    },
    select: { id: true, name: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  })

  return <NewMessageForm users={companyUsers} />
}
