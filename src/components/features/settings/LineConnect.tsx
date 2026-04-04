'use client'

import { useState } from 'react'

interface Props {
  lineUserId: string | null
}

export function LineConnect({ lineUserId }: Props) {
  const [mode, setMode] = useState<'view' | 'edit'>('view')
  const [value, setValue] = useState(lineUserId ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const res = await fetch('/api/user/line', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lineUserId: value.trim() || null }),
    })
    setSaving(false)
    if (res.ok) {
      setSaved(true)
      setMode('view')
      setTimeout(() => setSaved(false), 2500)
    } else {
      setError('保存に失敗しました')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">💬</span>
        <div>
          <p className="text-sm font-medium text-gray-700">LINE通知</p>
          <p className="text-xs text-gray-400">承認・リマインダーをLINEでも受け取れます</p>
        </div>
      </div>

      {mode === 'view' ? (
        <div className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
          <p className="text-sm text-gray-600">
            {lineUserId
              ? <span className="text-green-700 font-medium">✓ 連携済み</span>
              : <span className="text-gray-400">未連携</span>}
          </p>
          <button onClick={() => setMode('edit')}
            className="text-xs text-orange-600 hover:text-orange-700 font-medium">
            {lineUserId ? '変更' : '設定する'}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 space-y-1">
            <p className="font-medium">LINE User IDの確認方法</p>
            <p>1. LINEアプリで管理者から友達追加リンクを受け取る</p>
            <p>2. 友達に追加後、トークルームで「/myid」と送信</p>
            <p>3. 表示されたUser IDをここに貼り付ける</p>
          </div>
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="U1234567890abcdef..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#06C755' }}>
              {saving ? '保存中...' : '保存する'}
            </button>
            <button onClick={() => { setMode('view'); setError('') }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
              キャンセル
            </button>
            {lineUserId && (
              <button onClick={() => { setValue(''); handleSave() }}
                className="px-3 py-2 text-red-500 text-xs hover:text-red-700">
                連携解除
              </button>
            )}
          </div>
          {saved && <p className="text-xs text-green-600">✓ 保存しました</p>}
        </div>
      )}
    </div>
  )
}
