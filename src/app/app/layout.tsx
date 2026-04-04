import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { BottomNav } from '@/components/features/app/BottomNav'
import { SocketProvider } from '@/components/providers/SocketProvider'
import OfflineQueueBanner from '@/components/features/reports/OfflineQueueBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role === 'SUPER_ADMIN') redirect('/admin')

  return (
    <SocketProvider userId={session.user.id}>
      <div className="pb-[72px]">
        {children}
        <OfflineQueueBanner />
        <BottomNav />
      </div>
    </SocketProvider>
  )
}
