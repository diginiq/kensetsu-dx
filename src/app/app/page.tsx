import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { LogoutButton } from '@/components/features/auth/LogoutButton'

const SITE_STATUS_LABEL: Record<string, string> = {
  PLANNING: '計画中',
  ACTIVE: '施工中',
  COMPLETED: '竣工済',
  SUSPENDED: '中断',
}
const SITE_STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-gray-100 text-gray-600',
  ACTIVE: 'bg-orange-100 text-orange-700',
  COMPLETED: 'bg-green-100 text-green-700',
  SUSPENDED: 'bg-yellow-100 text-yellow-700',
}

export default async function AppPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  // COMPANY_ADMINの場合は全現場を表示、WORKERは割り当て済み現場のみ
  let sites: { id: string; name: string; clientName: string | null; status: string; _count: { photos: number } }[]

  if (session.user.role === 'COMPANY_ADMIN' && session.user.companyId) {
    sites = await prisma.site.findMany({
      where: {
        companyId: session.user.companyId,
        status: { not: 'ARCHIVED' },
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        clientName: true,
        status: true,
        _count: { select: { photos: true } },
      },
    })
  } else {
    // WORKERは割り当てられた現場のみ
    const assignments = await prisma.siteAssignment.findMany({
      where: { userId: session.user.id },
      include: {
        site: {
          select: {
            id: true,
            name: true,
            clientName: true,
            status: true,
            _count: { select: { photos: true } },
          },
        },
      },
    })
    sites = assignments
      .filter((a) => a.site.status !== 'ARCHIVED')
      .map((a) => a.site)
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* ヘッダー */}
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: '#E85D04' }}
            >
              <span className="text-white font-bold text-sm">建</span>
            </div>
            <div>
              <p className="text-xs text-white/70 leading-none">建設DX</p>
              <p className="font-bold text-sm leading-tight">{session.user.name}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 max-w-screen-sm mx-auto w-full px-4 py-5">
        <h1 className="text-lg font-bold text-gray-800 mb-4">担当現場</h1>

        {sites.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm">
            <p className="text-gray-400">割り当てられた現場がありません</p>
            <p className="text-xs text-gray-400 mt-1">管理者に現場の割り当てを依頼してください</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sites.map((site) => (
              <Link
                key={site.id}
                href={`/dashboard/sites/${site.id}`}
                className="block bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:border-orange-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">{site.name}</p>
                    {site.clientName && (
                      <p className="text-sm text-gray-500 mt-0.5">{site.clientName}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${SITE_STATUS_COLORS[site.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {SITE_STATUS_LABEL[site.status] ?? site.status}
                  </span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400">撮影枚数</span>
                  <span className="text-sm font-bold" style={{ color: '#E85D04' }}>
                    {site._count.photos}枚
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
