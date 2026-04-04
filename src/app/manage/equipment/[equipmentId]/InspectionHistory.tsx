'use client'

import { useState, useEffect } from 'react'
import { Plus, X } from 'lucide-react'

interface Inspection {
  id: string
  inspectedAt: string
  inspector: string
  result: string
  nextDueAt: string | null
  memo: string | null
  createdBy: { name: string }
}

interface Props {
  equipmentId: string
  equipmentName: string
  inspectionCycle: number | null
}

function addMonths(dateStr: string, months: number): string {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d.toISOString().split('T')[0]
}

export function InspectionHistory({ equipmentId, equipmentName, inspectionCycle }: Props) {
  const [inspections, setInspections] = useState<Inspection[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const today = new Date().toISOString().split('T')[0]
  const [inspectedAt, setInspectedAt] = useState(today)
  const [inspector, setInspector] = useState('')
  const [result, setResult] = useState('合格')
  const [nextDueAt, setNextDueAt] = useState(inspectionCycle ? addMonths(today, inspectionCycle) : '')
  const [memo, setMemo] = useState('')

  function handleInspectedAtChange(val: string) {
    setInspectedAt(val)
    if (inspectionCycle && val) {
      setNextDueAt(addMonths(val, inspectionCycle))
    }
  }

  useEffect(() => {
    fetch(`/api/equipment/${equipmentId}/inspections`)
      .then((r) => r.json())
      .then((d) => { setInspections(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [equipmentId])

  async function handleAdd() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/equipment/${equipmentId}/inspections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspectedAt, inspector, result, nextDueAt: nextDueAt || null, memo: memo || null }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '追加に失敗しました'); return }
      setInspections([data, ...inspections])
      setShowForm(false)
      setInspector('')
      setResult('合格')
      setNextDueAt('')
      setMemo('')
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-700">点検履歴</h3>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white font-medium rounded-lg"
          style={{ backgroundColor: '#E85D04' }}
        >
          <Plus size={15} />
          点検記録を追加
        </button>
      </div>

      {error && (
        <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {showForm && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="font-medium text-gray-700 text-sm">新しい点検記録</p>
            <button onClick={() => setShowForm(false)}><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">点検日 *</label>
              <input type="date" value={inspectedAt} onChange={(e) => handleInspectedAtChange(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">点検者 *</label>
              <input type="text" value={inspector} onChange={(e) => setInspector(e.target.value)} className={inputClass} placeholder="担当者名" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">点検結果</label>
              <select value={result} onChange={(e) => setResult(e.target.value)} className={inputClass}>
                <option value="合格">合格</option>
                <option value="要注意">要注意</option>
                <option value="不合格">不合格</option>
                <option value="修理完了">修理完了</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                次回点検予定日
                {inspectionCycle && <span className="ml-1 text-orange-500">（周期から自動計算）</span>}
              </label>
              <input type="date" value={nextDueAt} onChange={(e) => setNextDueAt(e.target.value)} className={inputClass} />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-500 mb-1">備考</label>
              <input type="text" value={memo} onChange={(e) => setMemo(e.target.value)} className={inputClass} placeholder="点検内容・メモ" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50">
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !inspectedAt || !inspector}
              className="px-4 py-1.5 text-sm text-white font-medium rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#E85D04' }}
            >
              {saving ? '保存中...' : '保存'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-400 py-4 text-center">読み込み中...</p>
      ) : inspections.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center bg-gray-50 rounded-xl">点検記録がありません</p>
      ) : (
        <div className="divide-y divide-gray-100 bg-white rounded-xl border border-gray-200 overflow-hidden">
          {inspections.map((ins) => (
            <div key={ins.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-800 text-sm">
                      {new Date(ins.inspectedAt).toLocaleDateString('ja-JP')}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      ins.result === '合格' ? 'bg-green-100 text-green-700' :
                      ins.result === '要注意' ? 'bg-yellow-100 text-yellow-700' :
                      ins.result === '不合格' ? 'bg-red-100 text-red-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {ins.result}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">点検者: {ins.inspector}</p>
                  {ins.memo && <p className="text-xs text-gray-500 mt-0.5">{ins.memo}</p>}
                </div>
                {ins.nextDueAt && (
                  <div className="text-right shrink-0">
                    <p className="text-xs text-gray-400">次回点検</p>
                    <p className="text-xs font-medium text-gray-700">
                      {new Date(ins.nextDueAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
