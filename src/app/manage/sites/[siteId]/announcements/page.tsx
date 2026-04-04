import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { AnnouncementManager } from './AnnouncementManager'

export default async function SiteAnnouncementsPage({ params }: { params: { siteId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    select: { id: true, name: true },
  })
  if (!site) redirect('/manage/sites')

  const announcements = await prisma.siteAnnouncement.findMany({
    where: { siteId: params.siteId },
    include: { createdBy: { select: { name: true } } },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
  })

  const serialized = announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    pinned: a.pinned,
    createdAt: a.createdAt.toISOString(),
    createdBy: a.createdBy,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/manage/sites" className="text-sm text-gray-500 hover:text-gray-700">
          ← 現場一覧
        </Link>
      </div>
      <h1 className="text-2xl font-bold text-gray-800">{site.name} — お知らせ</h1>
      <AnnouncementManager siteId={site.id} initialAnnouncements={serialized} />
    </div>
  )
}
