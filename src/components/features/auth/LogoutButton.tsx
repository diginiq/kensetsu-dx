'use client'

import { signOut } from 'next-auth/react'

export function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: '/login' })}
      className="text-sm text-white/80 hover:text-white underline min-h-touch flex items-center"
    >
      ログアウト
    </button>
  )
}
