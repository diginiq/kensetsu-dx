'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pin, Trash2, Plus, X } from 'lucide-react'

interface Announcement {
  id: string
  title: string
  body: string
  pinned: boolean
  createdAt: string
  createdBy: { name: string }
}

interface Props {
  siteId: string
  initialAnnouncements: Announcement[]
}

export function AnnouncementManager({ siteId, initialAnnouncements }: Props) {
  const router = useRouter()
  const [announcements, setAnnouncements] = useState(initialAnnouncements)
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pinned, setPinned] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/sites/${siteId}/announcements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, pinned }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '作成に失敗しました'); return }
      setAnnouncements([data, ...announcements])
      setTitle('')
      setBody('')
      setPinned(false)
      setShowForm(false)
      router.refresh()
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('このお知らせを削除しますか？')) return
    try {
      const res = await fetch(`/api/sites/${siteId}/announcements/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAnnouncements(announcements.filter((a) => a.id !== id))
      }
    } catch {
      setError('削除に失敗しました')
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{announcements.length}件のお知らせ</p>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 text-white text-sm font-medium rounded-lg"
          style={{ backgroundColor: '#E85D04' }}
        >
          <Plus size={16} />
          新しいお知らせ
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-orange-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-700">新しいお知らせ</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="お知らせのタイトル"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">本文</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="お知らせの内容を入力してください"
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={pinned}
              onChange={(e) => setPinned(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm text-gray-700">ピン留め（重要なお知らせとして上部に表示）</span>
          </label>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              キャンセル
            </button>
            <button
              onClick={handleCreate}
              disabled={saving || !title.trim() || !body.trim()}
              className="px-4 py-2 text-sm text-white font-medium rounded-lg disabled:opacity-50"
              style={{ backgroundColor: '#E85D04' }}
            >
              {saving ? '投稿中...' : '投稿する'}
            </button>
          </div>
        </div>
      )}

      {announcements.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-10 text-center text-gray-400">
          お知らせがまだありません
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann) => (
            <div key={ann.id} className={`bg-white rounded-xl border shadow-sm p-4 ${ann.pinned ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {ann.pinned && <Pin size={14} className="text-orange-500 shrink-0" />}
                    <h3 className="font-bold text-gray-800">{ann.title}</h3>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-line">{ann.body}</p>
                  <p className="text-xs text-gray-400 mt-2">
                    {ann.createdBy.name} ・ {new Date(ann.createdAt).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(ann.id)}
                  className="p-1 text-gray-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
