'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface AmendRequestItem {
  id: string
  userName: string
  siteName: string | null
  type: string
  requestedTimestamp: string
  reason: string
  status: string
  reviewNote: string | null
  createdAt: string
}

interface Props {
  requests: AmendRequestItem[]
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: '審査中',
  APPROVED: '承認済み',
  REJECTED: '却下',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

export function AmendRequestList({ requests }: Props) {
  const router = useRouter()
  const [reviewingId, setReviewingId] = useState<string | null>(null)
  const [reviewNote, setReviewNote] = useState('')
  const [loading, setLoading] = useState(false)

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    setLoading(true)
    const res = await fetch(`/api/manage/timeclock/amend-requests/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reviewNote }),
    })
    setLoading(false)
    if (res.ok) {
      setReviewingId(null)
      setReviewNote('')
      router.refresh()
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h2 className="font-bold text-gray-700">打刻修正申請</h2>
        {pendingCount > 0 && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">
            未処理 {pendingCount}件
          </span>
        )}
      </div>

      {requests.length === 0 ? (
        <div className="px-5 py-6 text-center text-gray-400 text-sm">申請がありません</div>
      ) : (
        <div className="divide-y divide-gray-100">
          {requests.map((r) => (
            <div key={r.id} className="px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{r.userName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      r.type === 'CLOCK_IN' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {r.type === 'CLOCK_IN' ? '出勤' : '退勤'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? ''}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    申請日時: {new Date(r.requestedTimestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    {r.siteName && <span className="text-gray-400 ml-2">({r.siteName})</span>}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">理由: {r.reason}</p>
                  {r.reviewNote && (
                    <p className="text-xs text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded">
                      コメント: {r.reviewNote}
                    </p>
                  )}
                </div>
                {r.status === 'PENDING' && (
                  <div className="shrink-0">
                    {reviewingId === r.id ? null : (
                      <button
                        onClick={() => { setReviewingId(r.id); setReviewNote('') }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        審査
                      </button>
                    )}
                  </div>
                )}
              </div>

              {reviewingId === r.id && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    rows={2}
                    placeholder="コメント（任意）"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(r.id, 'approve')}
                      disabled={loading}
                      className="flex-1 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      承認して打刻追加
                    </button>
                    <button
                      onClick={() => handleAction(r.id, 'reject')}
                      disabled={loading}
                      className="flex-1 py-1.5 bg-red-500 text-white text-sm font-medium rounded-lg hover:bg-red-600 disabled:opacity-50"
                    >
                      却下
                    </button>
                    <button
                      onClick={() => setReviewingId(null)}
                      className="px-3 py-1.5 bg-gray-100 text-gray-600 text-sm rounded-lg hover:bg-gray-200"
                    >
                      閉じる
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
