'use client'

import { useState } from 'react'
import { assignWorkers, toggleSiteStatus } from './actions'

const SITE_STATUS_MAP: Record<string, string> = {
  PLANNING: '計画中',
  ACTIVE: '施工中',
  COMPLETED: '竣工済',
  SUSPENDED: '中断',
}
const SITE_STATUS_COLORS: Record<string, string> = {
  PLANNING: 'bg-gray-100 text-gray-700',
  ACTIVE: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-yellow-100 text-yellow-800',
}

interface Worker {
  id: string
  name: string
}

interface Site {
  id: string
  name: string
  clientName: string | null
  status: string
  _count: { photos: number }
  assignments: { user: { id: string; name: string } }[]
}

interface Props {
  sites: Site[]
  workers: Worker[]
}

export function ManageSitesList({ sites, workers }: Props) {
  const [assigningSiteId, setAssigningSiteId] = useState<string | null>(null)
  const [selectedWorkers, setSelectedWorkers] = useState<Record<string, string[]>>({})

  function initAssign(site: Site) {
    setSelectedWorkers((prev) => ({
      ...prev,
      [site.id]: site.assignments.map((a) => a.user.id),
    }))
    setAssigningSiteId(site.id)
  }

  function toggleWorker(siteId: string, workerId: string) {
    setSelectedWorkers((prev) => {
      const current = prev[siteId] ?? []
      return {
        ...prev,
        [siteId]: current.includes(workerId)
          ? current.filter((id) => id !== workerId)
          : [...current, workerId],
      }
    })
  }

  async function handleAssign(siteId: string) {
    await assignWorkers(siteId, selectedWorkers[siteId] ?? [])
    setAssigningSiteId(null)
  }

  return (
    <div className="space-y-3">
      {sites.map((site) => (
        <div key={site.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-gray-800">{site.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${SITE_STATUS_COLORS[site.status] ?? 'bg-gray-100'}`}>
                  {SITE_STATUS_MAP[site.status] ?? site.status}
                </span>
              </div>
              {site.clientName && (
                <p className="text-sm text-gray-500 mt-0.5">{site.clientName}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                写真 {site._count.photos}枚 ／
                割当: {site.assignments.length > 0
                  ? site.assignments.map((a) => a.user.name).join('・')
                  : '未割当'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => initAssign(site)}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100"
              >
                割り当て
              </button>
              <form action={toggleSiteStatus.bind(null, site.id, site.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  {site.status === 'ACTIVE' ? '中断' : '再開'}
                </button>
              </form>
            </div>
          </div>

          {/* 作業員割り当てパネル */}
          {assigningSiteId === site.id && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-sm font-medium text-gray-700 mb-2">作業員を選択</p>
              {workers.length === 0 ? (
                <p className="text-sm text-gray-400">作業員が登録されていません</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                  {workers.map((w) => {
                    const checked = (selectedWorkers[site.id] ?? []).includes(w.id)
                    return (
                      <label
                        key={w.id}
                        className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer text-sm ${
                          checked ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleWorker(site.id, w.id)}
                          className="accent-orange-500"
                        />
                        {w.name}
                      </label>
                    )
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleAssign(site.id)}
                  className="px-4 py-2 text-white text-sm font-bold rounded-lg"
                  style={{ backgroundColor: '#E85D04' }}
                >
                  保存
                </button>
                <button
                  onClick={() => setAssigningSiteId(null)}
                  className="px-4 py-2 bg-gray-100 text-gray-600 text-sm rounded-lg"
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
      {sites.length === 0 && (
        <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200">
          現場が登録されていません
        </div>
      )}
    </div>
  )
}
