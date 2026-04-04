'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface HazardItem {
  id: string
  type: string
  typeLabel: string
  severity: string
  severityLabel: string
  location: string
  description: string
  cause: string | null
  countermeasure: string | null
  injured: boolean
  injuredCount: number | null
  status: string
  occurredAt: string
  siteName: string
  reporterName: string
}

interface Props {
  reports: HazardItem[]
}

const SEVERITY_STYLE: Record<string, string> = {
  HIGH: 'bg-red-100 text-red-800',
  MEDIUM: 'bg-yellow-100 text-yellow-800',
  LOW: 'bg-green-100 text-green-700',
}
const TYPE_STYLE: Record<string, string> = {
  NEAR_MISS: 'bg-yellow-50 text-yellow-800',
  ACCIDENT: 'bg-red-50 text-red-800',
  UNSAFE_CONDITION: 'bg-orange-50 text-orange-800',
}

export function HazardList({ reports }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleClose = async (id: string) => {
    if (!confirm('この案件を対応済みにしますか？')) return
    setLoadingId(id)
    await fetch(`/api/hazard/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'CLOSED' }),
    })
    setLoadingId(null)
    router.refresh()
  }

  return (
    <div className="space-y-3">
      {reports.map((r) => (
        <div key={r.id}
          className={`bg-white rounded-xl border shadow-sm overflow-hidden ${r.severity === 'HIGH' ? 'border-red-200' : r.severity === 'MEDIUM' ? 'border-yellow-200' : 'border-gray-200'}`}>
          <div
            className="px-5 py-4 cursor-pointer"
            onClick={() => setExpandedId(expandedId === r.id ? null : r.id)}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_STYLE[r.type] ?? 'bg-gray-100 text-gray-700'}`}>
                    {r.typeLabel}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_STYLE[r.severity] ?? ''}`}>
                    {r.severityLabel}
                  </span>
                  {r.injured && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-medium">
                      負傷{r.injuredCount ? ` ${r.injuredCount}名` : ''}
                    </span>
                  )}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.status === 'OPEN' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.status === 'OPEN' ? '未対応' : '対応済み'}
                  </span>
                </div>
                <p className="font-medium text-gray-800 truncate">{r.location}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(r.occurredAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  　{r.siteName}　報告者: {r.reporterName}
                </p>
              </div>
              <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expandedId === r.id ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {expandedId === r.id && (
            <div className="px-5 pb-4 border-t border-gray-100 space-y-3">
              <div>
                <p className="text-xs font-medium text-gray-500 mt-3 mb-1">状況説明</p>
                <p className="text-sm text-gray-700 whitespace-pre-line">{r.description}</p>
              </div>
              {r.cause && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">推定原因</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{r.cause}</p>
                </div>
              )}
              {r.countermeasure && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">再発防止策</p>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{r.countermeasure}</p>
                </div>
              )}
              {r.status === 'OPEN' && (
                <button
                  onClick={() => handleClose(r.id)}
                  disabled={loadingId === r.id}
                  className="mt-2 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {loadingId === r.id ? '処理中...' : '対応済みにする'}
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
