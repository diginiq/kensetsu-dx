'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, X } from 'lucide-react'

interface Entry {
  id: string
  type: 'CLOCK_IN' | 'CLOCK_OUT'
  timestamp: string
  siteName: string
}

interface WorkerStatus {
  userId: string
  name: string
  clockIn: Entry | null
  clockOut: Entry | null
  entries: Entry[]
}

interface Site {
  id: string
  name: string
}

interface Worker {
  id: string
  name: string
}

interface Props {
  workerStatuses: WorkerStatus[]
  sites: Site[]
  workers: Worker[]
  dateStr: string
}

export function TimeclockStatusClient({ workerStatuses, sites, workers, dateStr }: Props) {
  const router = useRouter()
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [addUserId, setAddUserId] = useState(workers[0]?.id ?? '')
  const [addSiteId, setAddSiteId] = useState(sites[0]?.id ?? '')
  const [addType, setAddType] = useState<'CLOCK_IN' | 'CLOCK_OUT'>('CLOCK_IN')
  const [addTime, setAddTime] = useState(() => {
    const now = new Date()
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const working = workerStatuses.filter((w) => w.clockIn && !w.clockOut)
  const done = workerStatuses.filter((w) => w.clockIn && w.clockOut)
  const notIn = workerStatuses.filter((w) => !w.clockIn)

  async function handleDelete(entryId: string) {
    if (!confirm('この打刻記録を削除しますか？')) return
    setDeletingId(entryId)
    try {
      const res = await fetch(`/api/manage/timeclock/${entryId}`, { method: 'DELETE' })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || '削除に失敗しました')
      } else {
        router.refresh()
      }
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setDeletingId(null)
    }
  }

  async function handleAdd() {
    setSaving(true)
    setError('')
    try {
      const [h, m] = addTime.split(':').map(Number)
      const ts = new Date(dateStr)
      ts.setHours(h, m, 0, 0)
      const res = await fetch('/api/manage/timeclock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: addUserId, siteId: addSiteId, type: addType, timestamp: ts.toISOString() }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || '追加に失敗しました')
      } else {
        setShowAdd(false)
        router.refresh()
      }
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  function EntryRow({ entry }: { entry: Entry }) {
    return (
      <div className="flex items-center justify-between text-sm py-1">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${entry.type === 'CLOCK_IN' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700'}`}>
            {entry.type === 'CLOCK_IN' ? '出勤' : '退勤'}
          </span>
          <span className="font-medium tabular-nums">
            {new Date(entry.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className="text-gray-400 text-xs">{entry.siteName}</span>
        </div>
        <button
          onClick={() => handleDelete(entry.id)}
          disabled={deletingId === entry.id}
          className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-40 transition-colors"
          title="削除"
        >
          <Trash2 size={14} />
        </button>
      </div>
    )
  }

  const selectClass = 'px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'

  return (
    <div className="space-y-5">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      {/* 統計 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-emerald-700">{working.length}</p>
          <p className="text-xs text-emerald-600 mt-0.5">出勤中</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-blue-700">{done.length}</p>
          <p className="text-xs text-blue-600 mt-0.5">退勤済み</p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-gray-500">{notIn.length}</p>
          <p className="text-xs text-gray-400 mt-0.5">未出勤</p>
        </div>
      </div>

      {/* 手動追加ボタン */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg"
          style={{ backgroundColor: '#E85D04' }}
        >
          <Plus size={16} />
          打刻を手動追加
        </button>
      </div>

      {/* 手動追加フォーム */}
      {showAdd && (
        <div className="bg-white border border-orange-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-700">打刻を手動追加</h3>
            <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">従業員</label>
              <select value={addUserId} onChange={(e) => setAddUserId(e.target.value)} className={selectClass + ' w-full'}>
                {workers.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">現場</label>
              <select value={addSiteId} onChange={(e) => setAddSiteId(e.target.value)} className={selectClass + ' w-full'}>
                {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">種別</label>
              <select value={addType} onChange={(e) => setAddType(e.target.value as 'CLOCK_IN' | 'CLOCK_OUT')} className={selectClass + ' w-full'}>
                <option value="CLOCK_IN">出勤</option>
                <option value="CLOCK_OUT">退勤</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">時刻</label>
              <input type="time" value={addTime} onChange={(e) => setAddTime(e.target.value)} className={selectClass + ' w-full'} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              キャンセル
            </button>
            <button
              onClick={handleAdd}
              disabled={saving || !addUserId || !addSiteId}
              className="px-4 py-2 text-sm text-white font-medium rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#E85D04' }}
            >
              {saving ? '保存中...' : '追加'}
            </button>
          </div>
        </div>
      )}

      {/* 出勤中 */}
      {working.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-emerald-700 mb-2">出勤中 ({working.length}名)</h2>
          <div className="bg-white border border-emerald-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {working.map((w) => (
              <div key={w.userId} className="px-4 py-3">
                <p className="font-medium text-gray-800 text-sm mb-1">{w.name}</p>
                {w.entries.map((e) => <EntryRow key={e.id} entry={e} />)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 退勤済み */}
      {done.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-blue-700 mb-2">退勤済み ({done.length}名)</h2>
          <div className="bg-white border border-blue-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {done.map((w) => (
              <div key={w.userId} className="px-4 py-3">
                <p className="font-medium text-gray-800 text-sm mb-1">{w.name}</p>
                {w.entries.map((e) => <EntryRow key={e.id} entry={e} />)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 未出勤 */}
      {notIn.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-gray-500 mb-2">未出勤 ({notIn.length}名)</h2>
          <div className="bg-white border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
            {notIn.map((w) => (
              <div key={w.userId} className="px-4 py-3 flex items-center justify-between">
                <p className="font-medium text-gray-500 text-sm">{w.name}</p>
                <span className="text-xs text-gray-300">打刻なし</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {workerStatuses.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>従業員が登録されていません</p>
        </div>
      )}
    </div>
  )
}
