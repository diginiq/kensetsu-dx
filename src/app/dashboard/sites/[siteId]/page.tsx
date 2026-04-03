import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CLIENT_TYPE_LABEL, SITE_STATUS_LABEL } from '@/lib/validations/site'
import { SiteTabs } from './SiteTabs'

interface Props {
  params: { siteId: string }
}

export default async function SiteDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')
  if (!session.user.companyId) redirect('/login')

  const site = await prisma.site.findFirst({
    where: {
      id: params.siteId,
      companyId: session.user.companyId,
      status: { not: 'ARCHIVED' },
    },
    include: {
      _count: { select: { photos: true } },
    },
  })

  if (!site) notFound()

  const statusColors: Record<string, string> = {
    PLANNING: 'bg-gray-100 text-gray-600',
    ACTIVE: 'bg-orange-100 text-orange-700',
    COMPLETED: 'bg-green-100 text-green-700',
    SUSPENDED: 'bg-yellow-100 text-yellow-700',
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ヘッダー */}
      <header className="text-white px-4 py-3 safe-top" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              href="/dashboard"
              className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors shrink-0"
              aria-label="ダッシュボードへ戻る"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </Link>
            <h1 className="font-bold text-base truncate">{site.name}</h1>
          </div>
          <Link
            href={`/dashboard/sites/${site.id}/edit`}
            className="shrink-0 text-sm font-medium bg-white/20 hover:bg-white/30 transition-colors px-3 py-1.5 rounded-lg min-h-touch flex items-center"
          >
            編集
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-screen-sm mx-auto w-full">
        {/* 現場情報カード */}
        <div className="bg-white border-b border-gray-200 px-4 py-5">
          {/* ステータス + 写真枚数 */}
          <div className="flex items-center justify-between mb-4">
            <span
              className={`text-sm font-medium px-3 py-1 rounded-full ${statusColors[site.status] ?? 'bg-gray-100 text-gray-600'}`}
            >
              {SITE_STATUS_LABEL[site.status] ?? site.status}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold" style={{ color: '#E85D04' }}>
                {site._count.photos}
              </span>
              <span className="text-sm text-gray-500">枚</span>
            </div>
          </div>

          {/* 現場詳細情報 */}
          <dl className="space-y-3">
            {site.clientName && (
              <div className="flex gap-2">
                <dt className="text-sm text-gray-500 w-20 shrink-0">発注者</dt>
                <dd className="text-sm font-medium flex items-center gap-2">
                  {site.clientName}
                  {site.clientType && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {CLIENT_TYPE_LABEL[site.clientType] ?? site.clientType}
                    </span>
                  )}
                </dd>
              </div>
            )}

            {site.address && (
              <div className="flex gap-2">
                <dt className="text-sm text-gray-500 w-20 shrink-0">住所</dt>
                <dd className="text-sm font-medium">{site.address}</dd>
              </div>
            )}

            {(site.startDate || site.endDate) && (
              <div className="flex gap-2">
                <dt className="text-sm text-gray-500 w-20 shrink-0">工期</dt>
                <dd className="text-sm font-medium">
                  {site.startDate
                    ? new Date(site.startDate).toLocaleDateString('ja-JP')
                    : '未定'}
                  {'　〜　'}
                  {site.endDate
                    ? new Date(site.endDate).toLocaleDateString('ja-JP')
                    : '未定'}
                </dd>
              </div>
            )}

            {site.contractAmount != null && (
              <div className="flex gap-2">
                <dt className="text-sm text-gray-500 w-20 shrink-0">請負金額</dt>
                <dd className="text-sm font-medium">
                  ¥{site.contractAmount.toLocaleString('ja-JP')}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* アクションボタン */}
        <div className="px-4 py-4 bg-white border-b border-gray-200 space-y-3">
          <Link
            href={`/dashboard/sites/${site.id}/capture`}
            className="w-full py-3 text-white font-bold rounded-xl text-base transition-opacity hover:opacity-90 flex flex-col items-center justify-center gap-1"
            style={{ backgroundColor: '#E85D04' }}
          >
            <div className="flex items-center gap-2">
              <CameraIcon />
              <span>撮影を開始する</span>
            </div>
          </Link>

          <Link
            href={`/dashboard/sites/${site.id}/album`}
            className="w-full py-3 bg-white text-gray-700 font-bold rounded-xl text-base transition-colors hover:bg-gray-50 flex flex-col items-center justify-center gap-1 border border-gray-300 shadow-sm"
          >
            <div className="flex items-center gap-2">
              <DocumentIcon />
              <span>写真台帳を作成する</span>
            </div>
          </Link>
        </div>

        {/* タブ（写真・フォルダ・設定） */}
        <SiteTabs siteId={site.id} />
      </main>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
    </svg>
  )
}

function DocumentIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m3.75 9v6m3-3H9m1.5-12H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}
