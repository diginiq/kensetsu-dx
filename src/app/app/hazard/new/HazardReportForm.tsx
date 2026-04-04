'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

const TYPE_OPTIONS = [
  { value: 'NEAR_MISS', label: 'ヒヤリハット', desc: '事故には至らなかったが危険だった', color: 'border-yellow-400 bg-yellow-50' },
  { value: 'UNSAFE_CONDITION', label: '危険箇所発見', desc: '危険な状態・環境を発見した', color: 'border-orange-400 bg-orange-50' },
  { value: 'ACCIDENT', label: '事故・災害', desc: '実際に事故・怪我が発生した', color: 'border-red-400 bg-red-50' },
]
const SEVERITY_OPTIONS = [
  { value: 'LOW', label: '軽微', color: 'border-green-400 bg-green-50 text-green-800' },
  { value: 'MEDIUM', label: '中程度', color: 'border-yellow-400 bg-yellow-50 text-yellow-800' },
  { value: 'HIGH', label: '重大', color: 'border-red-400 bg-red-50 text-red-800' },
]

interface Props {
  sites: { id: string; name: string }[]
}

export function HazardReportForm({ sites }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')
  const [type, setType] = useState('NEAR_MISS')
  const [severity, setSeverity] = useState('MEDIUM')
  const [occurredAt, setOccurredAt] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}T${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [cause, setCause] = useState('')
  const [countermeasure, setCountermeasure] = useState('')
  const [injured, setInjured] = useState(false)
  const [injuredCount, setInjuredCount] = useState(1)

  const handleSubmit = async () => {
    if (!siteId || !location.trim() || !description.trim()) {
      setError('必須項目を入力してください')
      return
    }
    setLoading(true)
    setError('')
    const res = await fetch('/api/hazard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, type, severity, occurredAt, location, description, cause, countermeasure, injured, injuredCount }),
    })
    setLoading(false)
    if (res.ok) {
      router.push('/app')
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? '送信に失敗しました')
    }
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-5 space-y-5 pb-24">
      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {/* 現場 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">現場 *</label>
        {sites.length === 0 ? (
          <p className="text-sm text-gray-400">担当現場がありません</p>
        ) : (
          <select value={siteId} onChange={(e) => setSiteId(e.target.value)}
            className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400">
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* 発生日時 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">発生日時 *</label>
        <input type="datetime-local" value={occurredAt} onChange={(e) => setOccurredAt(e.target.value)}
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      {/* 種別 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">種別 *</label>
        <div className="space-y-2">
          {TYPE_OPTIONS.map((opt) => (
            <label key={opt.value}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-colors ${type === opt.value ? opt.color : 'border-gray-200 bg-white'}`}>
              <input type="radio" value={opt.value} checked={type === opt.value} onChange={(e) => setType(e.target.value)}
                className="mt-0.5 accent-orange-500" />
              <div>
                <p className="font-medium text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-500">{opt.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* 重要度 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">重要度 *</label>
        <div className="grid grid-cols-3 gap-2">
          {SEVERITY_OPTIONS.map((opt) => (
            <button key={opt.value} type="button"
              onClick={() => setSeverity(opt.value)}
              className={`py-2 rounded-xl border-2 text-sm font-bold transition-colors ${severity === opt.value ? opt.color : 'border-gray-200 bg-white text-gray-500'}`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* 発生場所 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">発生場所 *</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)}
          placeholder="例: 2階 鉄骨作業エリア"
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400" />
      </div>

      {/* 状況説明 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">状況説明 *</label>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="何が起きたか詳しく記載してください"
          rows={4}
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
      </div>

      {/* 原因 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">推定原因（任意）</label>
        <textarea value={cause} onChange={(e) => setCause(e.target.value)}
          placeholder="なぜ発生したか"
          rows={2}
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
      </div>

      {/* 再発防止策 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">再発防止策（任意）</label>
        <textarea value={countermeasure} onChange={(e) => setCountermeasure(e.target.value)}
          placeholder="今後の対策"
          rows={2}
          className="w-full border border-gray-300 rounded-xl px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
      </div>

      {/* 負傷 */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <label className="flex items-center gap-3 cursor-pointer">
          <input type="checkbox" checked={injured} onChange={(e) => setInjured(e.target.checked)}
            className="w-5 h-5 accent-red-500 rounded" />
          <span className="font-medium text-gray-800">負傷者がいる</span>
        </label>
        {injured && (
          <div className="mt-3">
            <label className="block text-sm text-gray-600 mb-1">負傷者数</label>
            <input type="number" min={1} value={injuredCount} onChange={(e) => setInjuredCount(parseInt(e.target.value))}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        )}
      </div>

      <button onClick={handleSubmit} disabled={loading || sites.length === 0}
        className="w-full py-4 text-white font-bold rounded-xl text-base disabled:opacity-50"
        style={{ backgroundColor: '#E85D04' }}>
        {loading ? '送信中...' : '報告を提出する'}
      </button>
    </div>
  )
}
