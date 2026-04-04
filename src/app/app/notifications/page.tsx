import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { NotificationsClient } from './NotificationsClient'

export default async function NotificationsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const notifications = await prisma.appNotification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-white/80 hover:text-white">←</Link>
            <p className="font-bold">通知</p>
          </div>
          {unreadCount > 0 && (
            <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full font-bold">
              {unreadCount}件未読
            </span>
          )}
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-5 pb-24">
        <NotificationsClient
          initialNotifications={notifications.map((n) => ({
            id: n.id,
            title: n.title,
            body: n.body,
            url: n.url,
            isRead: n.read,
            createdAt: n.createdAt.toISOString(),
          }))}
        />
      </div>
    </div>
  )
}
