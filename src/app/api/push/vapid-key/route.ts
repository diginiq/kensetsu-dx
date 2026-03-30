import { NextResponse } from 'next/server'

/** クライアントが Push 購読する際に使う公開鍵 */
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY
  if (!key) return NextResponse.json({ configured: false, publicKey: null })
  return NextResponse.json({ configured: true, publicKey: key })
}
