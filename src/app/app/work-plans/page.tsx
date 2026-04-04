import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'

const DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日']

export default async function WorkerWorkPlansPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const today = new Date()
  const monday = new Date(today)
  const day = today.getDay()
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1))
  monday.setHours(0, 0, 0, 0)

  const assignments = await prisma.siteAssignment.findMany({
    where: { userId: session.user.id },
    select: { siteId: true },
  })
  const siteIds = assignments.map((a) => a.siteId)

  const plans = await prisma.weeklyWorkPlan.findMany({
    where: {
      siteId: { in: siteIds },
      weekStart: { gte: new Date(monday.getTime() - 7 * 86400000) },
    },
    include: { site: { select: { name: true } } },
    orderBy: [{ weekStart: 'desc' }, { siteId: 'asc' }],
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link href="/app" className="text-white/80 hover:text-white">←</Link>
          <p className="font-bold">週次作業計画</p>
        </div>
      </header>

      <div className="max-w-screen-sm mx-auto px-4 py-5 pb-24 space-y-4">
        {plans.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
            作業計画がありません
          </div>
        ) : (
          plans.map((plan) => {
            const ws = new Date(plan.weekStart)
            const we = new Date(ws); we.setDate(we.getDate() + 6)
            const items = plan.items as { date: string; task: string; workers: string; count: number; note: string }[]
            return (
              <div key={plan.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100" style={{ backgroundColor: '#455A64' }}>
                  <p className="font-bold text-white text-sm">{plan.site.name}</p>
                  <p className="text-xs text-white/70 mt-0.5">
                    {ws.toLocaleDateString('ja-JP')} 〜 {we.toLocaleDateString('ja-JP')}
                  </p>
                </div>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => {
                    const d = new Date(item.date)
                    const isToday = d.toISOString().split('T')[0] === today.toISOString().split('T')[0]
                    const isSat = d.getDay() === 6
                    const isSun = d.getDay() === 0
                    const dayIdx = d.getDay() === 0 ? 6 : d.getDay() - 1
                    return (
                      <div key={item.date}
                        className={`px-4 py-3 ${isToday ? 'bg-orange-50' : isSat ? 'bg-blue-50/50' : isSun ? 'bg-red-50/50' : ''}`}>
                        <div className="flex items-start gap-3">
                          <div className="shrink-0 text-center min-w-[36px]">
                            <p className="text-xs font-bold text-gray-700">{d.getDate()}</p>
                            <p className={`text-xs font-medium ${isSat ? 'text-blue-500' : isSun ? 'text-red-500' : 'text-gray-400'}`}>
                              {DAY_NAMES[dayIdx]}
                            </p>
                            {isToday && <p className="text-[10px] text-orange-600 font-bold">今日</p>}
                          </div>
                          <div className="flex-1 min-w-0">
                            {item.task ? (
                              <>
                                <p className="text-sm font-medium text-gray-800">{item.task}</p>
                                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                  {item.workers && <p className="text-xs text-gray-500">👷 {item.workers}</p>}
                                  {item.count > 0 && <p className="text-xs text-gray-500">{item.count}名</p>}
                                  {item.note && <p className="text-xs text-gray-400">{item.note}</p>}
                                </div>
                              </>
                            ) : (
                              <p className="text-xs text-gray-300">作業予定なし</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
