'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/features/auth/LogoutButton'

const navItems = [
  { href: '/manage', label: 'ダッシュボード', exact: true },
  { href: '/manage/company', label: '会社情報' },
  { href: '/manage/workers', label: '従業員管理' },
  { href: '/manage/sites', label: '現場管理' },
  { href: '/manage/billing', label: '課金管理' },
]

interface Props {
  companyName: string
}

export function ManageNav({ companyName }: Props) {
  const pathname = usePathname()

  return (
    <header style={{ backgroundColor: '#455A64' }} className="text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-8 h-8 rounded flex items-center justify-center shrink-0"
              style={{ backgroundColor: '#E85D04' }}
            >
              <span className="text-white font-bold text-sm">建</span>
            </div>
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
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-sm font-medium rounded-t whitespace-nowrap transition-colors ${
                  isActive
                    ? 'bg-white text-gray-800'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
