'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  title: string
  items: string[]
}

interface Props {
  site: { id: string; name: string }
  templates: Template[]
  alreadySubmitted: boolean
  today: string
}

export function KYForm({ site, templates, alreadySubmitted, today }: Props) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(!alreadySubmitted)
  const [selectedTemplateId, setSelectedTemplateId] = useState(templates[0]?.id ?? '')
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({})
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  const toggleItem = (i: number) => {
    setCheckedItems((prev) => ({ ...prev, [i]: !prev[i] }))
  }

  const handleSubmit = async () => {
    if (!selectedTemplate) {
      setError('チェックリストを選択してください')
      return
    }
    const items = selectedTemplate.items.map((item, i) => ({
      item,
      checked: !!checkedItems[i],
    }))
    setLoading(true)
    setError('')
    const res = await fetch('/api/ky', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: site.id,
        templateId: selectedTemplateId,
        items,
        notes,
        submittedDate: today,
      }),
    })
    setLoading(false)
    if (res.ok) {
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? '送信に失敗しました')
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <button
        className="w-full px-5 py-4 flex items-center justify-between"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
            alreadySubmitted ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
          }`}>
            {alreadySubmitted ? '✓' : '!'}
          </span>
          <span className="font-medium text-gray-800">{site.name}</span>
        </div>
        <svg className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && !alreadySubmitted && (
        <div className="px-5 pb-5 border-t border-gray-100 space-y-4">
          {templates.length === 0 ? (
            <p className="text-sm text-gray-400 py-4 text-center">
              KYチェックリストが設定されていません。管理者にご連絡ください。
            </p>
          ) : (
            <>
              {/* テンプレート選択 */}
              {templates.length > 1 && (
                <div className="pt-3">
                  <label className="block text-sm text-gray-600 mb-1">チェックリスト</label>
                  <select value={selectedTemplateId} onChange={(e) => {
                    setSelectedTemplateId(e.target.value)
                    setCheckedItems({})
                  }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}
                  </select>
                </div>
              )}

              {/* チェック項目 */}
              {selectedTemplate && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{selectedTemplate.title}</p>
                  {selectedTemplate.items.map((item, i) => (
                    <label key={i}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        checkedItems[i] ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                      }`}>
                      <input type="checkbox" checked={!!checkedItems[i]} onChange={() => toggleItem(i)}
                        className="w-5 h-5 accent-green-600 rounded flex-shrink-0" />
                      <span className={`text-sm ${checkedItems[i] ? 'text-green-800 line-through' : 'text-gray-700'}`}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              {/* 特記事項 */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">特記事項・気づき（任意）</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
                  rows={2} placeholder="本日の危険ポイントや気づきを記入"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <button onClick={handleSubmit} disabled={loading}
                className="w-full py-3 text-white font-bold rounded-xl text-base disabled:opacity-50"
                style={{ backgroundColor: '#E85D04' }}>
                {loading ? '提出中...' : 'KY活動を提出する'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
