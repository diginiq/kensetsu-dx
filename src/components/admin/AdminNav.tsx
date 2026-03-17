'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogoutButton } from '@/components/features/auth/LogoutButton'

const navItems = [
  { href: '/admin', label: 'ダッシュボード', exact: true },
  { href: '/admin/companies', label: '施工会社管理' },
]

export function AdminNav() {
  const pathname = usePathname()

  return (
    <header style={{ backgroundColor: '#455A64' }} className="text-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ backgroundColor: '#E85D04' }}
            >
              <span className="text-white font-bold text-sm">建</span>
            </div>
            <span className="font-bold text-base">建設DX SU管理</span>
          </div>
          <LogoutButton />
        </div>
        <nav className="flex gap-1 pb-0">
          {navItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 text-sm font-medium rounded-t transition-colors ${
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
