'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LeaveRequest {
  id: string
  type: string
  startDate: string
  endDate: string
  reason: string | null
  status: string
  reviewNote: string | null
  createdAt: string
}

interface Props {
  requests: LeaveRequest[]
}

const TYPE_OPTIONS = [
  { value: 'PAID', label: '有給休暇' },
  { value: 'ABSENCE', label: '欠勤' },
  { value: 'LATE', label: '遅刻' },
  { value: 'EARLY_LEAVE', label: '早退' },
]

const STATUS_LABEL: Record<string, string> = {
  PENDING: '審査中',
  APPROVED: '承認済み',
  REJECTED: '却下',
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

export function LeaveRequestClient({ requests }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [type, setType] = useState('PAID')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]

  const handleSubmit = async () => {
    if (!startDate) { setError('日付を入力してください'); return }
    if (!endDate) setEndDate(startDate)
    setLoading(true); setError('')
    const res = await fetch('/api/leave', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, startDate, endDate: endDate || startDate, reason }),
    })
    setLoading(false)
    if (res.ok) {
      setShowForm(false)
      setStartDate(''); setEndDate(''); setReason('')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? '申請に失敗しました')
    }
  }

  return (
    <div className="space-y-4">
      <button onClick={() => setShowForm(!showForm)}
        className="w-full py-3 text-white font-bold rounded-xl text-base"
        style={{ backgroundColor: '#E85D04' }}>
        + 申請する
      </button>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="font-bold text-gray-700">休暇・遅刻申請</h3>
          <div>
            <label className="block text-sm text-gray-600 mb-1">種別</label>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map((opt) => (
                <button key={opt.value} onClick={() => setType(opt.value)}
                  className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
                    type === opt.value
                      ? 'border-orange-400 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">開始日</label>
              <input type="date" value={startDate} min={today}
                onChange={(e) => { setStartDate(e.target.value); if (!endDate) setEndDate(e.target.value) }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">終了日</label>
              <input type="date" value={endDate} min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">理由・メモ（任意）</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)}
              rows={2} placeholder="私事都合、通院など"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSubmit} disabled={loading}
              className="flex-1 py-2.5 text-white font-bold rounded-xl text-sm disabled:opacity-50"
              style={{ backgroundColor: '#E85D04' }}>
              {loading ? '送信中...' : '申請する'}
            </button>
            <button onClick={() => { setShowForm(false); setError('') }}
              className="px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl text-sm">
              キャンセル
            </button>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          申請履歴はありません
        </div>
      ) : (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-500">申請履歴</h2>
          {requests.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-800">
                      {TYPE_OPTIONS.find((o) => o.value === req.type)?.label ?? req.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {STATUS_LABEL[req.status] ?? req.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(req.startDate).toLocaleDateString('ja-JP')}
                    {req.startDate.split('T')[0] !== req.endDate.split('T')[0] && ` 〜 ${new Date(req.endDate).toLocaleDateString('ja-JP')}`}
                  </p>
                  {req.reason && <p className="text-xs text-gray-400 mt-0.5">{req.reason}</p>}
                  {req.reviewNote && (
                    <p className="text-xs text-gray-500 mt-0.5">管理者コメント: {req.reviewNote}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
