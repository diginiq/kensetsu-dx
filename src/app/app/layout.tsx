import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { BottomNav } from '@/components/features/app/BottomNav'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (session.user.role === 'SUPER_ADMIN') redirect('/admin')

  return (
    <div className="pb-[72px]">
      {children}
      <BottomNav />
    </div>
  )
}
