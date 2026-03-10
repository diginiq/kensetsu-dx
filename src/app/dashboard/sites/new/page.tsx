import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { SiteForm } from '@/components/features/sites/SiteForm'

export default async function NewSitePage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ヘッダー */}
      <header className="text-white px-4 py-3 safe-top" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link
            href="/dashboard"
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label="戻る"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="font-bold text-base">新規現場登録</h1>
        </div>
      </header>

      {/* フォーム */}
      <main className="flex-1 px-4 py-6 max-w-screen-sm mx-auto w-full">
        <SiteForm mode="create" />
      </main>
    </div>
  )
}
