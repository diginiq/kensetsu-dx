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

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { name: true },
  })

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* オフラインバナー */}
      <OfflineBanner />

      {/* ヘッダー */}
      <header className="text-white px-4 py-3 safe-top" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#E85D04' }}
            >
              <span className="text-white font-bold text-sm">建</span>
            </div>
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

      {/* サイト一覧（Client Component） */}
      <SiteListSection />
    </div>
  )
}
