import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LogoutButton } from '@/components/features/auth/LogoutButton'
import { SiteListSection } from '@/components/features/sites/SiteListSection'
import { OfflineBanner } from '@/components/features/sync/OfflineBanner'
import { SyncStatusButton } from '@/components/features/sync/SyncStatusButton'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect('/login')
  }

  // ロール別リダイレクト
  if (session.user.role === 'SUPER_ADMIN') redirect('/admin')
  if (session.user.role === 'WORKER') redirect('/app')

  const company = session.user.companyId
    ? await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { name: true },
      })
    : null

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <OfflineBanner />
      <header className="text-white px-4 py-3 safe-top" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <img src="/logo.png" alt="KSDX" width={32} height={32} className="rounded shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-white/70 leading-none">建設DX</p>
              <p className="font-bold text-sm truncate leading-tight">
                {company?.name ?? '会社名未設定'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <SyncStatusButton />
            <LogoutButton />
          </div>
        </div>
      </header>
      <SiteListSection />
    </div>
  )
}
