import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { KYForm } from './KYForm'

export default async function KYPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // 担当現場
  const assignments = await prisma.siteAssignment.findMany({
    where: { userId: session.user.id },
    include: { site: { select: { id: true, name: true, status: true } } },
  })
  const sites = assignments
    .filter((a) => a.site.status === 'ACTIVE')
    .map((a) => ({ id: a.site.id, name: a.site.name }))

  // 今日の提出状況
  const todaySubmissions = await prisma.kYSubmission.findMany({
    where: {
      userId: session.user.id,
      submittedDate: { gte: today, lt: tomorrow },
    },
    include: { site: { select: { name: true } } },
  })

  // 全テンプレート取得
  const siteIds = sites.map((s) => s.id)
  const templates = await prisma.kYTemplate.findMany({
    where: {
      companyId: session.user.companyId,
      isActive: true,
      OR: [
        { siteId: { in: siteIds } },
        { siteId: null },
      ],
    },
    orderBy: [{ siteId: 'desc' }, { createdAt: 'asc' }],
  })

  const submittedSiteIds = new Set(todaySubmissions.map((s) => s.siteId))

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/app" className="text-white/80 hover:text-white">←</Link>
            <p className="font-bold">KY活動</p>
          </div>
          <span className="text-xs text-white/70">
            {today.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })}
          </span>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-5 space-y-4 pb-24">
        {/* 今日の提出済み */}
        {todaySubmissions.length > 0 && (
          <div className="space-y-2">
            {todaySubmissions.map((sub) => (
              <div key={sub.id} className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <span className="text-green-600 text-xl">✓</span>
                <div>
                  <p className="font-medium text-green-800 text-sm">{sub.site.name} — KY提出済み</p>
                  <p className="text-xs text-green-600">
                    {new Date(sub.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 提出
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {sites.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            担当現場がありません
          </div>
        ) : (
          sites.map((site) => (
            <KYForm
              key={site.id}
              site={site}
              templates={templates.filter((t) => !t.siteId || t.siteId === site.id)
                .map((t) => ({
                  id: t.id,
                  title: t.title,
                  items: t.items as string[],
                }))}
              alreadySubmitted={submittedSiteIds.has(site.id)}
              today={today.toISOString()}
            />
          ))
        )}
      </div>
    </div>
  )
}
