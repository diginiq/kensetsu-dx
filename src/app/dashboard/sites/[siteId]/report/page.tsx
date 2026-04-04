import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'

export default async function PhotoReportPage({ params }: { params: { siteId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId ?? '' },
    select: { id: true, name: true, _count: { select: { photos: true } } },
  })
  if (!site) notFound()

  const [oldest, newest] = await Promise.all([
    prisma.photo.findFirst({
      where: { siteId: site.id },
      orderBy: { takenAt: 'asc' },
      select: { takenAt: true },
    }),
    prisma.photo.findFirst({
      where: { siteId: site.id },
      orderBy: { takenAt: 'desc' },
      select: { takenAt: true },
    }),
  ])

  const defaultFrom = oldest?.takenAt ? oldest.takenAt.toISOString().split('T')[0] : ''
  const defaultTo = newest?.takenAt ? newest.takenAt.toISOString().split('T')[0] : ''

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link href={`/dashboard/sites/${params.siteId}`} className="text-white/80 hover:text-white">←</Link>
          <p className="font-bold">写真のエクスポート</p>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-6 space-y-5">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-1">{site.name}</h2>
          <p className="text-sm text-gray-400 mb-5">写真 {site._count.photos.toLocaleString('ja-JP')}枚</p>

          {/* 共通フィルター（両フォームで使い回し用の表示のみ - 各フォームに個別に持つ） */}

          {/* PDF出力 */}
          <form
            action={`/api/sites/${params.siteId}/photos/report`}
            method="GET"
            target="_blank"
            className="space-y-4 mb-6"
          >
            <p className="text-sm font-bold text-gray-700">📄 写真帳PDF</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">撮影日（開始）</label>
                <input type="date" name="dateFrom" defaultValue={defaultFrom}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">撮影日（終了）</label>
                <input type="date" name="dateTo" defaultValue={defaultTo}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">最大枚数</label>
              <select name="limit" defaultValue="60"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="20">20枚</option>
                <option value="40">40枚</option>
                <option value="60">60枚（推奨）</option>
                <option value="100">100枚</option>
                <option value="200">200枚</option>
              </select>
            </div>
            <button type="submit" className="w-full py-3 text-white font-bold rounded-xl text-base"
              style={{ backgroundColor: '#E85D04' }}>
              PDFを生成してダウンロード
            </button>
          </form>

          <hr className="border-gray-100 mb-6" />

          {/* ZIPダウンロード */}
          <form
            action={`/api/sites/${params.siteId}/photos/zip`}
            method="GET"
            className="space-y-4"
          >
            <p className="text-sm font-bold text-gray-700">📦 写真を一括ZIPダウンロード</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">撮影日（開始）</label>
                <input type="date" name="dateFrom" defaultValue={defaultFrom}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">撮影日（終了）</label>
                <input type="date" name="dateTo" defaultValue={defaultTo}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">最大枚数</label>
              <select name="limit" defaultValue="100"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                <option value="50">50枚</option>
                <option value="100">100枚（推奨）</option>
                <option value="200">200枚</option>
                <option value="300">300枚</option>
              </select>
            </div>
            <button type="submit"
              className="w-full py-3 font-bold rounded-xl text-base border-2 border-gray-300 text-gray-700 hover:bg-gray-50">
              ZIPをダウンロード
            </button>
          </form>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <p className="text-sm text-yellow-800 font-medium mb-1">注意事項</p>
          <ul className="text-xs text-yellow-700 space-y-1 list-disc list-inside">
            <li>写真枚数が多い場合、生成に時間がかかることがあります</li>
            <li>PDFは1ページあたり4枚（2×2）のレイアウトで出力されます</li>
            <li>ZIPには元の画像ファイルがそのまま含まれます</li>
          </ul>
        </div>
      </main>
    </div>
  )
}
