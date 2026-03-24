'use client'

import { useState } from 'react'
import { deleteSafetyDocument, submitSafetyDocument } from '../../actions'

const DOC_TYPE_LABELS: Record<string, string> = {
  SUBCONTRACT_NOTIFICATION: '再下請負通知書（様式1号）',
  WORKER_ROSTER: 'ワーカー名簿（様式2号）',
  CONSTRUCTION_SYSTEM: '施工体制台帳（様式3号）',
  SAFETY_PLAN: '安全衛生計画書（様式6号）',
  NEW_ENTRY_SURVEY: '新規入場者調査票（様式7号）',
  SAFETY_MEETING: '安全ミーティング報告書（様式8号）',
  FIRE_USE_PERMIT: '火気使用願（様式9号）',
  EQUIPMENT_ENTRY: '持込機械届（様式11号）',
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: '下書き',
  SUBMITTED: '提出済み',
  ACCEPTED: '受理',
  REJECTED: '差戻し',
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SUBMITTED: 'bg-blue-100 text-blue-800',
  ACCEPTED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-800',
}

interface Document {
  id: string
  documentType: string
  title: string
  status: string
  generatedPdfKey: string | null
  submittedAt: Date | null
  updatedAt: Date
  reviewComment: string | null
}

interface Props {
  documents: Document[]
  siteId: string
}

export function DocumentList({ documents, siteId }: Props) {
  const [filterType, setFilterType] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loading, setLoading] = useState<string | null>(null)

  const filtered = documents.filter((d) => {
    if (filterType && d.documentType !== filterType) return false
    if (filterStatus && d.status !== filterStatus) return false
    return true
  })

  const handleSubmit = async (docId: string) => {
    if (!confirm('この書類を提出しますか？')) return
    setLoading(docId)
    try {
      await submitSafetyDocument(docId)
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (docId: string) => {
    if (!confirm('この書類を削除しますか？')) return
    await deleteSafetyDocument(docId)
  }

  const handleGeneratePdf = async (docId: string) => {
    setLoading(docId)
    try {
      const res = await fetch(`/api/safety/documents/${docId}/generate-pdf`, { method: 'POST' })
      if (res.ok) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `safety_doc_${docId}.pdf`
        a.click()
        URL.revokeObjectURL(url)
      }
    } finally {
      setLoading(null)
    }
  }

  const handleBulkGenerate = async () => {
    setLoading('bulk')
    try {
      const res = await fetch(`/api/safety/sites/${siteId}/bulk-generate`, { method: 'POST' })
      const data = await res.json()
      alert(`一括生成完了: ${data.success}/${data.total}件 成功`)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* フィルタ・一括操作 */}
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">全種別</option>
          {Object.entries(DOC_TYPE_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">全ステータス</option>
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <button
          onClick={handleBulkGenerate}
          disabled={loading === 'bulk'}
          className="ml-auto px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {loading === 'bulk' ? '生成中...' : '一括PDF生成'}
        </button>
      </div>

      {/* 書類一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400">
            {documents.length === 0 ? '安全書類がまだ作成されていません' : '該当する書類がありません'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map((doc) => (
              <div key={doc.id} className="px-5 py-4 hover:bg-gray-50">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-gray-800">{doc.title}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[doc.status]}`}>
                        {STATUS_LABELS[doc.status]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {DOC_TYPE_LABELS[doc.documentType]} ・ 更新: {new Date(doc.updatedAt).toLocaleDateString('ja-JP')}
                    </p>
                    {doc.reviewComment && doc.status === 'REJECTED' && (
                      <p className="text-sm text-red-600 mt-1">差戻し理由: {doc.reviewComment}</p>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => handleGeneratePdf(doc.id)}
                      disabled={loading === doc.id}
                      className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50"
                    >
                      PDF
                    </button>
                    {doc.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmit(doc.id)}
                        disabled={loading === doc.id}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg text-white disabled:opacity-50"
                        style={{ backgroundColor: '#2E7D32' }}
                      >
                        提出
                      </button>
                    )}
                    {doc.status !== 'ACCEPTED' && (
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-50 text-red-600 hover:bg-red-100"
                      >
                        削除
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
