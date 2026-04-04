'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Camera, FileText, Clock, MessageCircle, Bell, type LucideIcon } from 'lucide-react'
import { useSocket } from '@/components/providers/SocketProvider'

const navItems: { href: string; label: string; icon: LucideIcon; exact?: boolean; badge?: 'messages' | 'notifications' }[] = [
  { href: '/app', label: '現場', icon: Camera, exact: true },
  { href: '/app/reports', label: '日報', icon: FileText },
  { href: '/app/timeclock', label: '打刻', icon: Clock },
  { href: '/app/messages', label: 'メッセージ', icon: MessageCircle, badge: 'messages' },
  { href: '/app/notifications', label: '通知', icon: Bell, badge: 'notifications' },
]

export function BottomNav() {
  const pathname = usePathname()
  const { unreadCount } = useSocket()
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    fetch('/api/notifications')
      .then((r) => r.json())
      .then((d) => setNotifCount(d.unreadCount ?? 0))
      .catch(() => {})
  }, [pathname])

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="max-w-screen-sm mx-auto flex">
        {navItems.map((item) => {
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href)
          const Icon = item.icon
          const badgeCount =
            item.badge === 'messages' ? unreadCount :
            item.badge === 'notifications' ? notifCount : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 min-h-[56px] justify-center transition-colors relative ${
                isActive
                  ? 'text-orange-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <div className="relative">
                <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
                {badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-1 ${isActive ? 'font-bold' : ''}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
