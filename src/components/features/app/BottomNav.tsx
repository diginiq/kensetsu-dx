'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Camera, FileText, Clock, MessageCircle, type LucideIcon } from 'lucide-react'

const navItems: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: '/app', label: '現場', icon: Camera, exact: true },
  { href: '/app/reports', label: '日報', icon: FileText },
  { href: '/app/timeclock', label: '打刻', icon: Clock },
  { href: '/app/messages', label: 'メッセージ', icon: MessageCircle },
]

export function BottomNav() {
  const pathname = usePathname()

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
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 min-h-[56px] justify-center transition-colors ${
                isActive
                  ? 'text-orange-600'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.5} />
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
