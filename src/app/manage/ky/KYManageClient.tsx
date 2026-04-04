'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Template {
  id: string
  title: string
  items: string[]
  isActive: boolean
  siteId: string | null
  siteName: string | null
  createdAt: string
}

interface Submission {
  id: string
  userName: string
  siteName: string
  templateTitle: string
  createdAt: string
  notes: string | null
  items: { item: string; checked: boolean }[]
}

interface Props {
  templates: Template[]
  sites: { id: string; name: string }[]
  todaySubmissions: Submission[]
}

export function KYManageClient({ templates, sites, todaySubmissions }: Props) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'submissions' | 'templates'>('submissions')
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [siteId, setSiteId] = useState('')
  const [itemsText, setItemsText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expandedSub, setExpandedSub] = useState<string | null>(null)

  const handleCreate = async () => {
    const items = itemsText.split('\n').map((l) => l.trim()).filter(Boolean)
    if (!title || items.length === 0) {
      setError('タイトルとチェック項目を入力してください')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/manage/ky/templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, items, siteId: siteId || null }),
    })
    setLoading(false)
    if (res.ok) {
      setShowForm(false)
      setTitle('')
      setSiteId('')
      setItemsText('')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? '作成に失敗しました')
    }
  }

  const handleDelete = async (templateId: string) => {
    if (!confirm('このテンプレートを無効化しますか？')) return
    await fetch(`/api/manage/ky/templates/${templateId}`, { method: 'DELETE' })
    router.refresh()
  }

  const activeTemplates = templates.filter((t) => t.isActive)
  const inactiveTemplates = templates.filter((t) => !t.isActive)

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">KY活動管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">危険予知チェックリストの管理・提出状況確認</p>
        </div>
      </div>

      {/* タブ */}
      <div className="flex border-b border-gray-200">
        {(['submissions', 'templates'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-orange-500 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'submissions' ? `今日の提出状況（${todaySubmissions.length}件）` : 'チェックリスト管理'}
          </button>
        ))}
      </div>

      {/* 今日の提出状況 */}
      {activeTab === 'submissions' && (
        <div>
          {todaySubmissions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              本日の提出はまだありません
            </div>
          ) : (
            <div className="space-y-3">
              {todaySubmissions.map((sub) => {
                const checkedCount = sub.items.filter((i) => i.checked).length
                const isExpanded = expandedSub === sub.id
                return (
                  <div key={sub.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <button
                      onClick={() => setExpandedSub(isExpanded ? null : sub.id)}
                      className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-7 h-7 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center">✓</span>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{sub.userName} — {sub.siteName}</p>
                          <p className="text-xs text-gray-500">
                            {sub.templateTitle} ・ {checkedCount}/{sub.items.length} チェック済み ・{' '}
                            {new Date(sub.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} 提出
                          </p>
                        </div>
                      </div>
                      <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-gray-100 space-y-2 pt-3">
                        {sub.items.map((item, i) => (
                          <div key={i} className={`flex items-center gap-2 text-sm ${item.checked ? 'text-green-700' : 'text-gray-500'}`}>
                            <span>{item.checked ? '☑' : '☐'}</span>
                            <span className={item.checked ? 'line-through' : ''}>{item.item}</span>
                          </div>
                        ))}
                        {sub.notes && (
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-xs text-gray-500 font-medium">特記事項</p>
                            <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-line">{sub.notes}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* チェックリスト管理 */}
      {activeTab === 'templates' && (
        <div className="space-y-4">
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-4 py-2 text-white rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#E85D04' }}
          >
            + 新規テンプレート作成
          </button>

          {showForm && (
            <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
              <h3 className="text-sm font-bold text-gray-700">新規チェックリスト</h3>
              <div>
                <label className="block text-xs text-gray-600 mb-1">タイトル</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 高所作業KYチェックリスト"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">適用現場（任意・空欄で全現場）</label>
                <select value={siteId} onChange={(e) => setSiteId(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                  <option value="">全現場共通</option>
                  {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">チェック項目（1行1項目）</label>
                <textarea value={itemsText} onChange={(e) => setItemsText(e.target.value)}
                  rows={5} placeholder={'墜落・転落の危険はないか\n飛来・落下の危険はないか\n感電の危険はないか\n安全帯を着用しているか'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2">
                <button onClick={handleCreate} disabled={loading}
                  className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                  style={{ backgroundColor: '#E85D04' }}>
                  {loading ? '作成中...' : '作成する'}
                </button>
                <button onClick={() => { setShowForm(false); setError('') }}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
                  キャンセル
                </button>
              </div>
            </div>
          )}

          {/* アクティブ */}
          {activeTemplates.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-600">有効なテンプレート</h3>
              {activeTemplates.map((t) => (
                <div key={t.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-800">{t.title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {t.siteName ? `現場: ${t.siteName}` : '全現場共通'} ・ {t.items.length}項目
                      </p>
                      <ul className="mt-2 space-y-1">
                        {t.items.map((item, i) => (
                          <li key={i} className="text-xs text-gray-600">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <button onClick={() => handleDelete(t.id)}
                      className="text-xs text-red-500 hover:text-red-700 shrink-0 mt-0.5">
                      無効化
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 非アクティブ */}
          {inactiveTemplates.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold text-gray-400">無効化されたテンプレート</h3>
              {inactiveTemplates.map((t) => (
                <div key={t.id} className="bg-gray-50 rounded-xl border border-gray-100 p-4 opacity-60">
                  <p className="font-medium text-gray-500">{t.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{t.items.length}項目</p>
                </div>
              ))}
            </div>
          )}

          {templates.length === 0 && (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
              テンプレートがありません。「新規テンプレート作成」から追加してください。
            </div>
          )}
        </div>
      )}
    </div>
  )
}
