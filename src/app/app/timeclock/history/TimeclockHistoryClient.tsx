'use client'

import { useState } from 'react'

interface AmendRequest {
  id: string
  type: string
  requestedTimestamp: string
  reason: string
  status: string
  reviewNote: string | null
  createdAt: string
}

interface Props {
  sites: { id: string; name: string }[]
  amendRequests: AmendRequest[]
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

export function TimeclockHistoryClient({ sites, amendRequests }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const res = await fetch('/api/timeclock/amend-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: fd.get('siteId'),
        type: fd.get('type'),
        requestedTimestamp: fd.get('requestedTimestamp'),
        reason: fd.get('reason'),
      }),
    })
    setLoading(false)
    if (res.ok) {
      setSuccess(true)
      setShowForm(false)
      ;(e.target as HTMLFormElement).reset()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? '送信に失敗しました')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-700">打刻修正申請</h2>
        <button
          onClick={() => { setShowForm(!showForm); setSuccess(false) }}
          className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
        >
          {showForm ? 'キャンセル' : '申請する'}
        </button>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          修正申請を送信しました。管理者が確認次第、打刻が修正されます。
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">現場</label>
            <select name="siteId" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">現場を選択</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">種別</label>
            <select name="type" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="CLOCK_IN">出勤</option>
              <option value="CLOCK_OUT">退勤</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">正しい日時</label>
            <input name="requestedTimestamp" type="datetime-local" required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">申請理由</label>
            <textarea name="reason" required rows={2}
              placeholder="打刻を忘れていました、など"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full py-2 text-white font-bold rounded-lg text-sm disabled:opacity-50"
            style={{ backgroundColor: '#E85D04' }}>
            {loading ? '送信中...' : '申請する'}
          </button>
        </form>
      )}

      {amendRequests.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-600">申請履歴（直近10件）</p>
          </div>
          <div className="divide-y divide-gray-100">
            {amendRequests.map((r) => (
              <div key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-700">
                    {r.type === 'CLOCK_IN' ? '出勤' : '退勤'} →{' '}
                    {new Date(r.requestedTimestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {STATUS_LABEL[r.status] ?? r.status}
                  </span>
                </div>
                <p className="text-xs text-gray-400">{r.reason}</p>
                {r.reviewNote && (
                  <p className="text-xs text-gray-500 mt-1 bg-gray-50 px-2 py-1 rounded">
                    管理者コメント: {r.reviewNote}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
