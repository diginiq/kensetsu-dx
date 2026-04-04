'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Milestone {
  id: string
  title: string
  plannedDate: string
  completedAt: string | null
  sortOrder: number
}

interface Props {
  siteId: string
  milestones: Milestone[]
}

export function MilestoneManager({ siteId, milestones }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [plannedDate, setPlannedDate] = useState('')
  const [loading, setLoading] = useState(false)

  const handleCreate = async () => {
    if (!title || !plannedDate) return
    setLoading(true)
    await fetch('/api/manage/milestones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, title, plannedDate, sortOrder: milestones.length }),
    })
    setLoading(false)
    setShowForm(false); setTitle(''); setPlannedDate('')
    router.refresh()
  }

  const toggleComplete = async (m: Milestone) => {
    await fetch(`/api/manage/milestones/${m.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completedAt: m.completedAt ? null : new Date().toISOString() }),
    })
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    await fetch(`/api/manage/milestones/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  const now = new Date()
  const completedCount = milestones.filter((m) => m.completedAt).length

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-700">工程マイルストーン</h2>
          {milestones.length > 0 && (
            <p className="text-xs text-gray-400 mt-0.5">{completedCount}/{milestones.length} 完了</p>
          )}
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="text-sm px-3 py-1.5 text-white rounded-lg font-medium"
          style={{ backgroundColor: '#455A64' }}>
          + 追加
        </button>
      </div>

      {showForm && (
        <div className="flex gap-2 mb-4">
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="マイルストーン名"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={handleCreate} disabled={loading || !title || !plannedDate}
            className="px-3 py-2 text-white rounded-lg text-sm disabled:opacity-50"
            style={{ backgroundColor: '#E85D04' }}>
            追加
          </button>
        </div>
      )}

      {milestones.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">マイルストーンがありません</p>
      ) : (
        <div className="space-y-2">
          {milestones.map((m) => {
            const planned = new Date(m.plannedDate)
            const isOverdue = !m.completedAt && planned < now
            return (
              <div key={m.id} className={`flex items-center gap-3 p-3 rounded-lg border ${
                m.completedAt ? 'bg-green-50 border-green-200' : isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
              }`}>
                <button onClick={() => toggleComplete(m)}
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    m.completedAt ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400'
                  }`}>
                  {m.completedAt && <span className="text-xs">✓</span>}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${m.completedAt ? 'text-green-800 line-through' : isOverdue ? 'text-red-700' : 'text-gray-700'}`}>
                    {m.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    予定: {planned.toLocaleDateString('ja-JP')}
                    {m.completedAt && ` → 完了: ${new Date(m.completedAt).toLocaleDateString('ja-JP')}`}
                    {isOverdue && ' ⚠️ 遅延'}
                  </p>
                </div>
                <button onClick={() => handleDelete(m.id)}
                  className="text-xs text-gray-300 hover:text-red-400 shrink-0">✕</button>
              </div>
            )
          })}
        </div>
      )}

      {/* 進捗バー */}
      {milestones.length > 0 && (
        <div className="mt-4">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${Math.round((completedCount / milestones.length) * 100)}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1 text-right">
            {Math.round((completedCount / milestones.length) * 100)}% 完了
          </p>
        </div>
      )}
    </div>
  )
}
