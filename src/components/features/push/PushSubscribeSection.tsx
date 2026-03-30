'use client'

import { useCallback, useEffect, useState } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i)
  return outputArray
}

interface Props {
  /** 例: /sw-app-push.js */
  swScript: string
  /** 例: /app/ */
  scope: string
}

export function PushSubscribeSection({ swScript, scope }: Props) {
  const [ready, setReady] = useState(false)
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const refresh = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      setReady(true)
      return
    }
    try {
      const name = swScript.split('/').pop() || ''
      const regs = await navigator.serviceWorker.getRegistrations()
      const reg = regs.find((r) => r.active?.scriptURL.includes(name))
      const sub = await reg?.pushManager.getSubscription()
      setSubscribed(!!sub)
      setSupported(true)
    } catch {
      setSupported(false)
    }
    setReady(true)
  }, [scope, swScript])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function subscribe() {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/push/vapid-key')
      const data = await res.json()
      if (!data.configured || !data.publicKey) {
        setMessage('サーバーで Web Push が設定されていません。管理者にお問い合わせください。')
        setLoading(false)
        return
      }

      const perm = await Notification.requestPermission()
      if (perm !== 'granted') {
        setMessage('通知の許可が必要です。')
        setLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.register(swScript, { scope })
      await registration.update()

      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey) as BufferSource,
      })

      const json = sub.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        setMessage('購読の取得に失敗しました。')
        setLoading(false)
        return
      }

      const save = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        }),
      })
      if (!save.ok) {
        const err = await save.json().catch(() => ({}))
        setMessage((err as { error?: string }).error || '登録に失敗しました')
        setLoading(false)
        return
      }
      setSubscribed(true)
    } catch {
      setMessage('登録中にエラーが発生しました。')
    }
    setLoading(false)
  }

  async function unsubscribe() {
    setLoading(true)
    setMessage('')
    try {
      const name = swScript.split('/').pop() || ''
      const regs = await navigator.serviceWorker.getRegistrations()
      const reg = regs.find((r) => r.active?.scriptURL.includes(name))
      const sub = await reg?.pushManager.getSubscription()
      if (sub) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch {
      setMessage('解除に失敗しました。')
    }
    setLoading(false)
  }

  if (!ready) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Loader2 size={16} className="animate-spin" />
        読み込み中…
      </div>
    )
  }

  if (!supported) {
    return (
      <p className="text-sm text-gray-500">
        お使いのブラウザではプッシュ通知に対応していないか、制限されています。
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-600">
        メッセージ受信時に、ブラウザが閉じていても通知を受け取れます（対応ブラウザのみ）。
      </p>
      {message && <p className="text-sm text-red-600">{message}</p>}
      {subscribed ? (
        <button
          type="button"
          onClick={unsubscribe}
          disabled={loading}
          className="inline-flex items-center gap-2 min-h-touch px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <BellOff size={18} />}
          プッシュ通知を解除
        </button>
      ) : (
        <button
          type="button"
          onClick={subscribe}
          disabled={loading}
          className="inline-flex items-center gap-2 min-h-touch px-4 py-2 rounded-lg text-white text-sm font-bold disabled:opacity-50"
          style={{ backgroundColor: '#E85D04' }}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Bell size={18} />}
          プッシュ通知を有効にする
        </button>
      )}
    </div>
  )
}
