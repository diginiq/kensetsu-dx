'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, ChevronUp, Loader2, CheckCheck } from 'lucide-react'
import { ReportActions } from './ReportActions'
import { REPORT_STATUS_LABEL, REPORT_STATUS_COLOR, calcWorkingMinutes, formatMinutes } from '@/lib/reportUtils'

interface Report {
  id: string
  reportDate: string
  startTime: string
  endTime: string | null
  breakMinutes: number
  weather: string | null
  temperature: number | null
  workCategories: any
  memo: string | null
  status: string
  rejectReason: string | null
  user: { id: string; name: string }
  site: { id: string; name: string }
  approvedBy: { name: string } | null
}

interface Props {
  reports: Report[]
}

export function ReportTable({ reports }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [bulkError, setBulkError] = useState('')

  const submittedIds = reports.filter((r) => r.status === 'SUBMITTED').map((r) => r.id)

  async function handleBulkApprove() {
    if (submittedIds.length === 0) return
    if (!confirm(`承認待ち ${submittedIds.length}件 をまとめて承認しますか？`)) return
    setBulkLoading(true)
    setBulkError('')
    try {
      const res = await fetch('/api/reports/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportIds: submittedIds }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `HTTP ${res.status}`)
      }
      router.refresh()
    } catch (e: any) {
      setBulkError(e.message)
    } finally {
      setBulkLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      {submittedIds.length > 1 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-3">
          <p className="text-sm text-blue-700 font-medium">
            承認待ちが {submittedIds.length}件 あります
          </p>
          <div className="flex items-center gap-3">
            {bulkError && <span className="text-xs text-red-600">{bulkError}</span>}
            <button
              onClick={handleBulkApprove}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold rounded-lg disabled:opacity-50 transition-colors"
            >
              {bulkLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCheck className="w-4 h-4" />}
              一括承認
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-gray-500 font-medium w-6"></th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">日付</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">ワーカー</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">現場</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">実働</th>
                <th className="text-left px-4 py-3 text-gray-500 font-medium">ステータス</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((r) => {
                const workMin = r.endTime
                  ? calcWorkingMinutes(new Date(r.startTime), new Date(r.endTime), r.breakMinutes)
                  : null
                const isExpanded = expandedId === r.id
                const categories = Array.isArray(r.workCategories) ? r.workCategories : []

                return (
                  <>
                    <tr
                      key={r.id}
                      className={`hover:bg-gray-50 cursor-pointer ${isExpanded ? 'bg-orange-50/40' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4" />
                          : <ChevronDown className="w-4 h-4" />}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {new Date(r.reportDate).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric', weekday: 'short' })}
                      </td>
                      <td className="px-4 py-3 text-gray-700">{r.user.name}</td>
                      <td className="px-4 py-3 text-gray-600 max-w-32 truncate">{r.site.name}</td>
                      <td className="px-4 py-3 text-gray-600">{workMin ? formatMinutes(workMin) : '-'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REPORT_STATUS_COLOR[r.status]}`}>
                          {REPORT_STATUS_LABEL[r.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <ReportActions reportId={r.id} status={r.status} />
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr key={`${r.id}-detail`} className="bg-orange-50/30">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                            {/* 基本情報 */}
                            <div className="space-y-2">
                              <div className="flex gap-6">
                                {r.weather && (
                                  <span className="text-gray-600">天気: <strong>{r.weather}</strong></span>
                                )}
                                {r.temperature != null && (
                                  <span className="text-gray-600">気温: <strong>{r.temperature}°C</strong></span>
                                )}
                              </div>
                              <div className="text-gray-600">
                                勤務: {new Date(r.startTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                {' 〜 '}
                                {r.endTime
                                  ? new Date(r.endTime).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
                                  : '未記録'}
                                {' ／ 休憩 '}{r.breakMinutes}分
                              </div>
                              {categories.length > 0 && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">作業内容</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {categories.map((c: any, i: number) => (
                                      <span key={i} className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                                        {c.category}{c.detail ? ` / ${c.detail}` : ''}{c.hours ? ` ${c.hours}h` : ''}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>

                            {/* メモ・差戻し理由 */}
                            <div className="space-y-2">
                              {r.memo && (
                                <div>
                                  <p className="text-xs font-medium text-gray-500 mb-1">メモ</p>
                                  <p className="text-gray-700 whitespace-pre-wrap text-xs bg-white rounded border border-gray-200 px-3 py-2">
                                    {r.memo}
                                  </p>
                                </div>
                              )}
                              {r.rejectReason && (
                                <div>
                                  <p className="text-xs font-medium text-red-500 mb-1">差戻し理由</p>
                                  <p className="text-red-700 text-xs bg-red-50 rounded border border-red-200 px-3 py-2">
                                    {r.rejectReason}
                                  </p>
                                </div>
                              )}
                              {r.approvedBy && (
                                <p className="text-xs text-gray-400">承認者: {r.approvedBy.name}</p>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
              {reports.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">日報がありません</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
