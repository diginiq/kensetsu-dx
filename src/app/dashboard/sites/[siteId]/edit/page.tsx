import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { SiteForm } from '@/components/features/sites/SiteForm'

interface Props {
  params: { siteId: string }
}

export default async function SiteEditPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const site = await prisma.site.findFirst({
    where: {
      id: params.siteId,
      companyId: session.user.companyId,
      status: { not: 'ARCHIVED' },
    },
  })

  if (!site) notFound()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ヘッダー */}
      <header className="text-white px-4 py-3 safe-top" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link
            href={`/dashboard/sites/${site.id}`}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
            aria-label="戻る"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </Link>
          <h1 className="font-bold text-base truncate">現場編集</h1>
        </div>
      </header>

      {/* フォーム */}
      <main className="flex-1 px-4 py-6 max-w-screen-sm mx-auto w-full">
        <SiteForm
          mode="edit"
          siteId={site.id}
          defaultValues={{
            name: site.name,
            clientName: site.clientName,
            clientType: site.clientType,
            address: site.address,
            startDate: site.startDate,
            endDate: site.endDate,
            contractAmount: site.contractAmount,
            status: site.status as 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED',
          }}
        />
      </main>
    </div>
  )
}
