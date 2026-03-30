'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/features/auth/LogoutButton'
import { useSocket } from '@/components/providers/SocketProvider'

const navItems = [
  { href: '/manage', label: 'ダッシュボード', exact: true },
  { href: '/manage/company', label: '会社情報' },
  { href: '/manage/workers', label: '従業員管理' },
  { href: '/manage/sites', label: '現場管理' },
  { href: '/manage/safety', label: '安全書類' },
  { href: '/manage/equipment', label: '機械管理' },
  { href: '/manage/reports', label: '日報管理' },
  { href: '/manage/messages', label: 'メッセージ', showUnreadBadge: true },
  { href: '/manage/overtime', label: '労働時間' },
  { href: '/manage/attendance', label: '出面表' },
  { href: '/manage/billing', label: '課金管理' },
]

interface Props {
  companyName: string
}

export function ManageNav({ companyName }: Props) {
  const pathname = usePathname()
  const { unreadCount } = useSocket()

  return (
    <header style={{ backgroundColor: '#455A64' }} className="text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3 min-w-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.png" alt="KSDX" width={32} height={32} className="rounded shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-white/60 leading-none">建設DX 管理画面</p>
              <p className="font-bold text-sm truncate leading-tight">{companyName}</p>
            </div>
          </div>
          <LogoutButton />
        </div>
        <nav className="flex gap-1 overflow-x-auto pb-0">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            const badge =
              'showUnreadBadge' in item &&
              item.showUnreadBadge &&
              unreadCount > 0 ? (
                <span className="ml-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              ) : null
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors inline-flex items-center ${
                  isActive
                    ? 'bg-white text-gray-800'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
                {badge}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
