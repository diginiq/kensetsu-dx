'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Album {
  id: string
  title: string
  token: string
  expiresAt: string | null
}

interface Props {
  siteId: string
  albums: Album[]
}

export function SharedAlbumManager({ siteId, albums }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [password, setPassword] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [loading, setLoading] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const handleCreate = async () => {
    if (!title) return
    setLoading(true)
    const res = await fetch('/api/manage/shared-albums', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, title, description, password: password || undefined, expiresAt: expiresAt || undefined }),
    })
    setLoading(false)
    if (res.ok) {
      setShowForm(false); setTitle(''); setDescription(''); setPassword(''); setExpiresAt('')
      router.refresh()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このアルバムを無効化しますか？')) return
    await fetch(`/api/manage/shared-albums/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  const copyLink = async (token: string, id: string) => {
    const url = `${baseUrl}/share/${token}`
    await navigator.clipboard.writeText(url).catch(() => {})
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-700">共有アルバム</h2>
        <button onClick={() => setShowForm(!showForm)}
          className="text-sm px-3 py-1.5 text-white rounded-lg font-medium"
          style={{ backgroundColor: '#1565C0' }}>
          + 作成
        </button>
      </div>

      {showForm && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3 mb-4">
          <h3 className="text-sm font-bold text-blue-800">新規共有アルバム</h3>
          <input value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder="アルバムタイトル"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="説明（任意）" rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">パスワード（任意）</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="設定しない場合は空欄"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">有効期限（任意）</label>
              <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={loading || !title}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#1565C0' }}>
              {loading ? '作成中...' : 'URLを発行する'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">キャンセル</button>
          </div>
        </div>
      )}

      {albums.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">共有アルバムがありません</p>
      ) : (
        <div className="space-y-2">
          {albums.map((album) => {
            const expired = album.expiresAt ? new Date(album.expiresAt) < new Date() : false
            return (
              <div key={album.id} className={`flex items-center gap-3 p-3 rounded-lg border ${expired ? 'bg-gray-50 border-gray-200 opacity-60' : 'bg-blue-50 border-blue-200'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800">{album.title}</p>
                  <p className="text-xs text-gray-400 truncate">{baseUrl}/share/{album.token}</p>
                  {album.expiresAt && (
                    <p className={`text-xs mt-0.5 ${expired ? 'text-red-500' : 'text-gray-400'}`}>
                      期限: {new Date(album.expiresAt).toLocaleDateString('ja-JP')}{expired && ' ⚠️ 期限切れ'}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => copyLink(album.token, album.id)}
                    className="text-xs px-2 py-1 rounded bg-blue-600 text-white hover:bg-blue-700">
                    {copiedId === album.id ? 'コピー済み！' : 'URLコピー'}
                  </button>
                  <button onClick={() => handleDelete(album.id)}
                    className="text-xs text-red-400 hover:text-red-600">無効化</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
