'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LeaveRequest {
  id: string
  userName: string
  userId: string
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

const TYPE_LABEL: Record<string, string> = {
  PAID: '有給休暇',
  ABSENCE: '欠勤',
  LATE: '遅刻',
  EARLY_LEAVE: '早退',
}

const STATUS_COLOR: Record<string, string> = {
  PENDING: 'bg-orange-100 text-orange-700',
  APPROVED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
}

export function LeaveManageClient({ requests }: Props) {
  const router = useRouter()
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL')
  const [reviewNote, setReviewNote] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = filter === 'ALL' ? requests : requests.filter((r) => r.status === filter)
  const pendingCount = requests.filter((r) => r.status === 'PENDING').length

  const handle = async (id: string, action: 'approve' | 'reject') => {
    setLoading(id)
    await fetch(`/api/manage/leave/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, reviewNote: reviewNote[id] || '' }),
    })
    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">休暇申請管理</h1>
        <p className="text-sm text-gray-500 mt-0.5">有給・欠勤・遅刻・早退の申請を承認・却下</p>
      </div>

      {/* フィルタ */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? 'bg-gray-800 text-white' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}>
            {s === 'ALL' ? `すべて（${requests.length}）`
              : s === 'PENDING' ? `未処理（${pendingCount}）`
              : s === 'APPROVED' ? '承認済み' : '却下'}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          申請がありません
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <div key={req.id} className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800">{req.userName}</span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {TYPE_LABEL[req.type] ?? req.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[req.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {req.status === 'PENDING' ? '未処理' : req.status === 'APPROVED' ? '承認済み' : '却下'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {new Date(req.startDate).toLocaleDateString('ja-JP')}
                    {req.startDate !== req.endDate && ` 〜 ${new Date(req.endDate).toLocaleDateString('ja-JP')}`}
                  </p>
                  {req.reason && <p className="text-sm text-gray-500 mt-0.5">理由: {req.reason}</p>}
                  {req.reviewNote && <p className="text-xs text-gray-400 mt-0.5">管理者メモ: {req.reviewNote}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    申請日: {new Date(req.createdAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {req.status === 'PENDING' && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <input
                    value={reviewNote[req.id] ?? ''}
                    onChange={(e) => setReviewNote((p) => ({ ...p, [req.id]: e.target.value }))}
                    placeholder="コメント（任意）"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handle(req.id, 'approve')}
                      disabled={loading === req.id}
                      className="flex-1 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                      style={{ backgroundColor: '#2E7D32' }}>
                      承認する
                    </button>
                    <button
                      onClick={() => handle(req.id, 'reject')}
                      disabled={loading === req.id}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                      却下する
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
