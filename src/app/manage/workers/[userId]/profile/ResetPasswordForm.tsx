'use client'

import { useState } from 'react'
import { Eye, EyeOff, CheckCircle, AlertCircle, KeyRound } from 'lucide-react'
import { resetWorkerPassword } from '../../actions'

export function ResetPasswordForm({ workerId }: { workerId: string }) {
  const [open, setOpen] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (password !== confirm) {
      setError('パスワードが一致しません')
      return
    }

    setLoading(true)
    const result = await resetWorkerPassword(workerId, password)
    setLoading(false)

    if (result) {
      setError(result.error)
    } else {
      setSuccess(true)
      setPassword('')
      setConfirm('')
      setOpen(false)
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-gray-500" />
          <h3 className="font-bold text-gray-700 text-sm">パスワードリセット</h3>
        </div>
        {!open && (
          <button
            onClick={() => { setOpen(true); setSuccess(false); setError('') }}
            className="text-sm px-3 py-1.5 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            新しいパスワードを設定
          </button>
        )}
      </div>

      {success && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          パスワードをリセットしました
        </div>
      )}

      {open && (
        <form onSubmit={handleSubmit} className="space-y-3">
          {error && (
            <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-gray-600 mb-1">新しいパスワード</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="8文字以上"
                className="w-full min-h-touch px-4 py-3 pr-12 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#E85D04' } as React.CSSProperties}
              />
              <button
                type="button"
                onClick={() => setShowPw((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">確認（再入力）</label>
            <input
              type={showPw ? 'text' : 'password'}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="もう一度入力"
              className="w-full min-h-touch px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 min-h-touch text-white font-bold rounded-lg disabled:opacity-50 text-sm"
              style={{ backgroundColor: '#E85D04' }}
            >
              {loading ? '更新中...' : 'パスワードを更新'}
            </button>
            <button
              type="button"
              onClick={() => { setOpen(false); setError('') }}
              className="px-4 min-h-touch border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              キャンセル
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
