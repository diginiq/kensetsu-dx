import { NextResponse } from 'next/server'

/** ロードバランサ・監視用（認証なし） */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'kensetsu-dx',
    time: new Date().toISOString(),
  })
}
