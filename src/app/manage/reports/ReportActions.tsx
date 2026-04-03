'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, X } from 'lucide-react'

interface Props {
  reportId: string
  status: string
}

export function ReportActions({ reportId, status }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showRejectForm, setShowRejectForm] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [error, setError] = useState('')

  async function handleApprove() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${reportId}/approve`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleReject() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/reports/${reportId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `HTTP ${res.status}`)
      }
      setShowRejectForm(false)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (status !== 'SUBMITTED') {
    return (
      <span className="text-xs text-gray-400">
        {status === 'APPROVED' ? '承認済み' : status === 'REJECTED' ? '差戻し済' : '-'}
      </span>
    )
  }

  if (showRejectForm) {
    return (
      <div className="flex flex-col gap-1.5 min-w-52">
        <input
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="差戻し理由（任意）"
          className="text-xs px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-red-400"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex gap-1">
          <button
            onClick={handleReject}
            disabled={loading}
            className="flex items-center gap-1 text-xs px-2 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 font-medium disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
            差戻し確定
          </button>
          <button
            onClick={() => { setShowRejectForm(false); setError('') }}
            disabled={loading}
            className="text-xs px-2 py-1.5 bg-gray-100 text-gray-600 rounded disabled:opacity-50"
          >
            キャンセル
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          onClick={handleApprove}
          disabled={loading}
          className="flex items-center gap-1 text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 font-medium disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          承認
        </button>
        <button
          onClick={() => setShowRejectForm(true)}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 font-medium disabled:opacity-50"
        >
          差戻し
        </button>
      </div>
      {error && <p className="text-xs text-red-600 mt-0.5">{error}</p>}
    </div>
  )
}
