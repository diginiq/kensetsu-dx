import { getToken } from 'next-auth/jwt'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  const isAuth = !!token
  const pathname = req.nextUrl.pathname

  const isAuthPage = pathname === '/login' || pathname === '/register'
  const isDashboard = pathname.startsWith('/dashboard')

  // 認証済みユーザーがログイン/登録ページにアクセスした場合はダッシュボードへ
  if (isAuthPage && isAuth) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // 未認証ユーザーがダッシュボードにアクセスした場合はログインへ
  if (isDashboard && !isAuth) {
    const loginUrl = new URL('/login', req.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
}
