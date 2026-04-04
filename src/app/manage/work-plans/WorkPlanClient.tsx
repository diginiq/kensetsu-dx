'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface PlanItem {
  date: string
  task: string
  workers: string
  count: number
  note: string
}

interface Plan {
  id: string
  siteId: string
  siteName: string
  weekStart: string
  items: PlanItem[]
}

interface Props {
  sites: { id: string; name: string }[]
  plans: Plan[]
}

function getMonday(d: Date): Date {
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setDate(diff)
  mon.setHours(0, 0, 0, 0)
  return mon
}

function buildWeekDays(monday: Date): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(d.getDate() + i)
    return d.toISOString().split('T')[0]
  })
}

const DAY_NAMES = ['月', '火', '水', '木', '金', '土', '日']

export function WorkPlanClient({ sites, plans }: Props) {
  const router = useRouter()
  const monday = getMonday(new Date())
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')
  const [weekStart, setWeekStart] = useState(monday.toISOString().split('T')[0])
  const [items, setItems] = useState<PlanItem[]>(
    buildWeekDays(monday).map((date) => ({ date, task: '', workers: '', count: 0, note: '' }))
  )
  const [loading, setLoading] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)

  const weekDays = buildWeekDays(new Date(weekStart))

  const updateItem = (idx: number, field: keyof PlanItem, value: string | number) => {
    setItems((prev) => prev.map((it, i) => i === idx ? { ...it, [field]: value } : it))
  }

  const handleWeekChange = (newWeek: string) => {
    setWeekStart(newWeek)
    setItems(buildWeekDays(new Date(newWeek)).map((date) => ({ date, task: '', workers: '', count: 0, note: '' })))
  }

  const handleSubmit = async () => {
    const filledItems = items.filter((it) => it.task.trim())
    if (!siteId || !weekStart || filledItems.length === 0) return
    setLoading(true)
    await fetch('/api/manage/work-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, weekStart, items: filledItems }),
    })
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">週次作業計画</h1>
        <p className="text-sm text-gray-500 mt-0.5">現場ごとの週次作業予定を作成・管理</p>
      </div>

      {/* 作成フォーム */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="font-bold text-gray-700">作業計画を作成</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">現場</label>
            <select value={siteId} onChange={(e) => setSiteId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">週（月曜日）</label>
            <input type="date" value={weekStart} onChange={(e) => handleWeekChange(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium border border-gray-200 w-20">日</th>
                <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium border border-gray-200">作業内容</th>
                <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium border border-gray-200 w-28">担当者</th>
                <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium border border-gray-200 w-16">人数</th>
                <th className="text-left py-2 px-3 text-xs text-gray-500 font-medium border border-gray-200">備考</th>
              </tr>
            </thead>
            <tbody>
              {weekDays.map((date, i) => {
                const d = new Date(date)
                const isSat = d.getDay() === 6
                const isSun = d.getDay() === 0
                return (
                  <tr key={date} className={isSat ? 'bg-blue-50' : isSun ? 'bg-red-50' : ''}>
                    <td className="py-1.5 px-3 border border-gray-200">
                      <p className="text-xs font-medium text-gray-700">
                        {d.getMonth() + 1}/{d.getDate()}
                        <span className={`ml-1 ${isSat ? 'text-blue-500' : isSun ? 'text-red-500' : 'text-gray-400'}`}>
                          ({DAY_NAMES[i]})
                        </span>
                      </p>
                    </td>
                    <td className="py-1 px-2 border border-gray-200">
                      <input value={items[i]?.task ?? ''} onChange={(e) => updateItem(i, 'task', e.target.value)}
                        placeholder="作業内容"
                        className="w-full px-2 py-1 text-sm border border-transparent focus:border-orange-300 focus:outline-none rounded" />
                    </td>
                    <td className="py-1 px-2 border border-gray-200">
                      <input value={items[i]?.workers ?? ''} onChange={(e) => updateItem(i, 'workers', e.target.value)}
                        placeholder="担当者名"
                        className="w-full px-2 py-1 text-sm border border-transparent focus:border-orange-300 focus:outline-none rounded" />
                    </td>
                    <td className="py-1 px-2 border border-gray-200">
                      <input type="number" min={0} value={items[i]?.count || ''} onChange={(e) => updateItem(i, 'count', parseInt(e.target.value) || 0)}
                        className="w-full px-2 py-1 text-sm border border-transparent focus:border-orange-300 focus:outline-none rounded text-center" />
                    </td>
                    <td className="py-1 px-2 border border-gray-200">
                      <input value={items[i]?.note ?? ''} onChange={(e) => updateItem(i, 'note', e.target.value)}
                        placeholder="備考"
                        className="w-full px-2 py-1 text-sm border border-transparent focus:border-orange-300 focus:outline-none rounded" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <button onClick={handleSubmit} disabled={loading}
          className="px-5 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-50"
          style={{ backgroundColor: '#E85D04' }}>
          {loading ? '保存中...' : '作業計画を保存する'}
        </button>
      </div>

      {/* 過去の計画一覧 */}
      {plans.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-bold text-gray-700">保存済み作業計画</h2>
          {plans.map((plan) => {
            const ws = new Date(plan.weekStart)
            const we = new Date(ws); we.setDate(we.getDate() + 6)
            return (
              <div key={plan.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-800">{plan.siteName}</p>
                    <p className="text-xs text-gray-500">
                      {ws.toLocaleDateString('ja-JP')} 〜 {we.toLocaleDateString('ja-JP')} ・ {plan.items.length}日分
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                      className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
                      {selectedPlan?.id === plan.id ? '閉じる' : '詳細'}
                    </button>
                    <a href={`/api/sites/${plan.siteId}/work-plan-pdf?weekStart=${plan.weekStart.split('T')[0]}`}
                      target="_blank"
                      className="text-xs px-3 py-1.5 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200">
                      PDF
                    </a>
                  </div>
                </div>
                {selectedPlan?.id === plan.id && (
                  <div className="border-t border-gray-100 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          {['日付', '作業内容', '担当者', '人数', '備考'].map((h) => (
                            <th key={h} className="text-left py-1.5 px-3 text-gray-500 font-medium border-b border-gray-200">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {plan.items.map((item) => {
                          const d = new Date(item.date)
                          return (
                            <tr key={item.date} className="border-b border-gray-100">
                              <td className="py-1.5 px-3 text-gray-600">{d.getMonth() + 1}/{d.getDate()}({DAY_NAMES[d.getDay() === 0 ? 6 : d.getDay() - 1]})</td>
                              <td className="py-1.5 px-3 text-gray-700">{item.task}</td>
                              <td className="py-1.5 px-3 text-gray-600">{item.workers}</td>
                              <td className="py-1.5 px-3 text-gray-600 text-center">{item.count || '-'}</td>
                              <td className="py-1.5 px-3 text-gray-500">{item.note}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
