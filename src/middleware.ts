import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isAuth = !!token
  const pathname = req.nextUrl.pathname

  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isAdminPath = pathname.startsWith('/admin')
  const isManagePath = pathname.startsWith('/manage')
  const isAppPath = pathname.startsWith('/app')
  const isDashboardPath = pathname.startsWith('/dashboard')

  // 未認証 → ログインへ
  if (!isAuth && (isAdminPath || isManagePath || isAppPath || isDashboardPath)) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 認証済みがログイン/登録ページ → ロール別にリダイレクト
  if (isAuthPage && isAuth) {
    const role = token.role as string
    if (role === 'SUPER_ADMIN') return NextResponse.redirect(new URL('/admin', req.url))
    if (role === 'COMPANY_ADMIN') return NextResponse.redirect(new URL('/manage', req.url))
    return NextResponse.redirect(new URL('/app', req.url))
  }

  // /admin/* → SUPER_ADMINのみ
  if (isAdminPath && isAuth) {
    if (token.role !== 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/login', req.url))
    }
  }

  // /manage/* → COMPANY_ADMINのみ
  if (isManagePath && isAuth) {
    if (token.role !== 'COMPANY_ADMIN') {
      if (token.role === 'SUPER_ADMIN') return NextResponse.redirect(new URL('/admin', req.url))
      return NextResponse.redirect(new URL('/app', req.url))
    }
  }

  // /app/* → WORKER と COMPANY_ADMIN がアクセス可
  if (isAppPath && isAuth) {
    if (token.role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
  }

  // /dashboard/* → ロール別リダイレクト
  if (isDashboardPath && isAuth) {
    if (token.role === 'SUPER_ADMIN') {
      return NextResponse.redirect(new URL('/admin', req.url))
    }
    if (token.role === 'COMPANY_ADMIN') {
      return NextResponse.redirect(new URL('/manage', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/admin/:path*', '/manage/:path*', '/app/:path*', '/login', '/register'],
}
