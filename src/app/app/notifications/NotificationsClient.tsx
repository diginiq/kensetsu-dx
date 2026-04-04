'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Notification {
  id: string
  title: string
  body: string
  url: string | null
  isRead: boolean
  createdAt: string
}

interface Props {
  initialNotifications: Notification[]
}

export function NotificationsClient({ initialNotifications }: Props) {
  const router = useRouter()
  const [notifications, setNotifications] = useState(initialNotifications)
  const [markingAll, setMarkingAll] = useState(false)

  const unreadCount = notifications.filter((n) => !n.isRead).length

  const markRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    )
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    })
  }

  const markAllRead = async () => {
    setMarkingAll(true)
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: 'all' }),
    })
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    setMarkingAll(false)
    router.refresh()
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
        通知はありません
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={markAllRead}
            disabled={markingAll}
            className="text-xs text-orange-600 hover:text-orange-700 disabled:opacity-50"
          >
            すべて既読にする
          </button>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((notif) => {
          const content = (
            <div
              className={`rounded-xl border px-4 py-3 transition-colors ${
                notif.isRead
                  ? 'bg-white border-gray-200'
                  : 'bg-orange-50 border-orange-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${notif.isRead ? 'bg-gray-300' : 'bg-orange-500'}`} />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${notif.isRead ? 'text-gray-700' : 'text-gray-900'}`}>
                    {notif.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">{notif.body}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(notif.createdAt).toLocaleString('ja-JP', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          )

          if (notif.url) {
            return (
              <Link
                key={notif.id}
                href={notif.url}
                onClick={() => !notif.isRead && markRead(notif.id)}
              >
                {content}
              </Link>
            )
          }

          return (
            <button
              key={notif.id}
              className="w-full text-left"
              onClick={() => !notif.isRead && markRead(notif.id)}
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
