'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, Loader2 } from 'lucide-react'
import Link from 'next/link'

const ROLE_LABEL: Record<string, string> = {
  COMPANY_ADMIN: 'マネージャー',
  WORKER: 'ワーカー',
}

interface Props {
  users: { id: string; name: string; role: string }[]
  /** 会話URLのベース（例: /app/messages または /manage/messages） */
  messagesBasePath?: string
  backHref?: string
}

export function NewMessageForm({ users, messagesBasePath = '/app/messages', backHref }: Props) {
  const listHref = backHref ?? messagesBasePath
  const router = useRouter()
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function toggleUser(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!subject.trim() || !body.trim() || selectedIds.length === 0) {
      setError('宛先・題名・本文をすべて入力してください')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: subject.trim(), body: body.trim(), recipientIds: selectedIds }),
      })
      if (res.ok) {
        const data = await res.json()
        router.push(`${messagesBasePath}/${data.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'エラーが発生しました')
      }
    } catch {
      setError('通信エラーが発生しました')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link href={listHref} className="text-white/80 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <p className="font-bold">新規メッセージ</p>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-5 pb-24">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              宛先を選択 ({selectedIds.length}名)
            </label>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 max-h-48 overflow-y-auto">
              {users.map((u) => (
                <label
                  key={u.id}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(u.id)}
                    onChange={() => toggleUser(u.id)}
                    className="w-5 h-5 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800">{u.name}</p>
                    <p className="text-xs text-gray-400">{ROLE_LABEL[u.role] ?? u.role}</p>
                  </div>
                </label>
              ))}
              {users.length === 0 && (
                <p className="px-4 py-3 text-sm text-gray-400">送信先のユーザーがいません</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
              題名
            </label>
            <input
              id="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="メッセージの題名"
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div>
            <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">
              本文
            </label>
            <textarea
              id="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="メッセージの内容を入力..."
              rows={5}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !subject.trim() || !body.trim() || selectedIds.length === 0}
            className="w-full min-h-touch rounded-xl text-white font-bold text-base flex items-center justify-center gap-2 disabled:opacity-40 transition-colors"
            style={{ backgroundColor: '#E85D04' }}
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                送信中...
              </>
            ) : (
              <>
                <Send size={18} />
                送信する
              </>
            )}
          </button>
        </form>
      </main>
    </div>
  )
}
