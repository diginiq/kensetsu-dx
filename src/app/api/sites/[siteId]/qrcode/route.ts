import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import QRCode from 'qrcode'

export async function GET(
  req: NextRequest,
  { params }: { params: { siteId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    select: { id: true, name: true },
  })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000'
  const clockInUrl = `${baseUrl}/app/timeclock?siteId=${site.id}&type=CLOCK_IN`
  const clockOutUrl = `${baseUrl}/app/timeclock?siteId=${site.id}&type=CLOCK_OUT`

  const [clockInSvg, clockOutSvg] = await Promise.all([
    QRCode.toString(clockInUrl, { type: 'svg', width: 200, margin: 2 }),
    QRCode.toString(clockOutUrl, { type: 'svg', width: 200, margin: 2 }),
  ])

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>QRコード - ${site.name}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Hiragino Sans', 'Meiryo', sans-serif; background: #fff; padding: 24px; }
    h1 { font-size: 18px; color: #455A64; margin-bottom: 4px; }
    .subtitle { font-size: 12px; color: #888; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 600px; }
    .card { border: 2px solid #e0e0e0; border-radius: 12px; padding: 20px; text-align: center; }
    .card.checkin { border-color: #2E7D32; }
    .card.checkout { border-color: #1565C0; }
    .card-label { font-size: 22px; font-weight: bold; margin-bottom: 12px; }
    .card.checkin .card-label { color: #2E7D32; }
    .card.checkout .card-label { color: #1565C0; }
    .card svg { max-width: 180px; }
    .url { font-size: 9px; color: #aaa; word-break: break-all; margin-top: 10px; }
    .site-name { font-size: 13px; color: #555; margin-top: 8px; font-weight: bold; }
    .print-hint { font-size: 11px; color: #aaa; margin-top: 20px; }
    @media print { .print-hint { display: none; } }
  </style>
</head>
<body>
  <h1>${site.name} — QRコード</h1>
  <p class="subtitle">このQRコードを現場に掲示し、スキャンして打刻を行ってください</p>
  <div class="grid">
    <div class="card checkin">
      <div class="card-label">出勤</div>
      ${clockInSvg}
      <div class="site-name">${site.name}</div>
      <div class="url">${clockInUrl}</div>
    </div>
    <div class="card checkout">
      <div class="card-label">退勤</div>
      ${clockOutSvg}
      <div class="site-name">${site.name}</div>
      <div class="url">${clockOutUrl}</div>
    </div>
  </div>
  <p class="print-hint">印刷してご利用ください（Ctrl+P / ⌘P）</p>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  })
}
