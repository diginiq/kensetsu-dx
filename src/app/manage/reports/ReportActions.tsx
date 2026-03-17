'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  reportId: string
  status: string
}

export function ReportActions({ reportId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  async function handleApprove() {
    setLoading(true)
    await fetch(`/api/reports/${reportId}/approve`, { method: 'POST' })
    router.refresh()
    setLoading(false)
  }

  async function handleReject() {
    setLoading(true)
    await fetch(`/api/reports/${reportId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    })
    setShowRejectForm(false)
    router.refresh()
    setLoading(false)
  }

  if (status !== 'SUBMITTED') {
    return <span className="text-xs text-gray-400">{status === 'APPROVED' ? '承認済み' : status === 'REJECTED' ? '差戻し済' : '-'}</span>
  }

  if (showRejectForm) {
    return (
      <div className="flex flex-col gap-1 min-w-48">
        <input
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="差戻し理由"
          className="text-xs px-2 py-1 border border-gray-300 rounded"
        />
        <div className="flex gap-1">
          <button onClick={handleReject} disabled={loading} className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200">
            差戻し確定
          </button>
          <button onClick={() => setShowRejectForm(false)} className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded">
            キャンセル
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-1">
      <button onClick={handleApprove} disabled={loading} className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium">
        承認
      </button>
      <button onClick={() => setShowRejectForm(true)} className="text-xs px-3 py-1 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium">
        差戻し
      </button>
    </div>
  )
}
