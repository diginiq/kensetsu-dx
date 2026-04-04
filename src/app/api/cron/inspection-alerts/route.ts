import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendMail } from '@/lib/mail'
import { notifyUsers } from '@/lib/appNotifications'

// 毎日朝に呼び出す（Vercel Cron / 外部サービス）
// Authorization: Bearer CRON_SECRET
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const now = new Date()
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  // 30日以内に点検期限が来る（または超過済み）機材を取得
  const equipment = await prisma.equipment.findMany({
    where: {
      nextInspection: { lte: in30Days },
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          users: {
            where: { role: 'COMPANY_ADMIN', isActive: true },
            select: { id: true, email: true },
            take: 1,
          },
        },
      },
    },
  })

  // 会社ごとにグループ化
  const byCompany = new Map<string, {
    companyName: string
    adminId: string
    adminEmail: string
    items: { name: string; nextInspection: Date; daysUntil: number }[]
  }>()

  for (const eq of equipment) {
    if (!eq.nextInspection) continue
    const admin = eq.company.users[0]
    if (!admin) continue

    const daysUntil = Math.ceil((eq.nextInspection.getTime() - now.getTime()) / 86400000)

    if (!byCompany.has(eq.companyId)) {
      byCompany.set(eq.companyId, {
        companyName: eq.company.name,
        adminId: admin.id,
        adminEmail: admin.email,
        items: [],
      })
    }
    byCompany.get(eq.companyId)!.items.push({
      name: eq.name,
      nextInspection: eq.nextInspection,
      daysUntil,
    })
  }

  let notifiedCount = 0

  for (const [, data] of byCompany) {
    const expired = data.items.filter((i) => i.daysUntil < 0)
    const urgent = data.items.filter((i) => i.daysUntil >= 0 && i.daysUntil <= 7)
    const upcoming = data.items.filter((i) => i.daysUntil > 7)

    // アプリ内通知
    const title = expired.length > 0
      ? `⚠️ 機材点検期限超過: ${expired.map((i) => i.name).join('、')}`
      : `🔧 機材点検期限が近づいています`
    const body = `${data.items.length}件の機材を確認してください`

    notifyUsers([data.adminId], { title, body, url: '/manage/equipment' }).catch(() => {})

    // メール通知
    if (data.adminEmail) {
      const rows = data.items.map((item) => {
        const label = item.daysUntil < 0
          ? `<span style="color:#dc2626;font-weight:bold">期限超過 ${Math.abs(item.daysUntil)}日</span>`
          : item.daysUntil <= 7
          ? `<span style="color:#dc2626;font-weight:bold">あと${item.daysUntil}日</span>`
          : `<span style="color:#d97706">あと${item.daysUntil}日</span>`
        return `<tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.name}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.nextInspection.toLocaleDateString('ja-JP')}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${label}</td>
        </tr>`
      }).join('')

      sendMail({
        to: data.adminEmail,
        subject: `【建設DX】機材点検アラート（${data.items.length}件）`,
        html: `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#d97706;margin-bottom:8px">🔧 機材点検アラート</h2>
  <p style="color:#374151">${data.companyName} 管理者様</p>
  ${expired.length > 0 ? `<p style="color:#dc2626;font-weight:bold">⚠️ 点検期限超過: ${expired.length}件</p>` : ''}
  ${urgent.length > 0 ? `<p style="color:#d97706">⚡ 7日以内: ${urgent.length}件</p>` : ''}
  ${upcoming.length > 0 ? `<p style="color:#374151">📋 30日以内: ${upcoming.length}件</p>` : ''}
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <thead><tr style="background:#f9fafb">
      <th style="padding:8px;text-align:left">機材名</th>
      <th style="padding:8px;text-align:left">次回点検日</th>
      <th style="padding:8px;text-align:left">残日数</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p><a href="${process.env.NEXTAUTH_URL ?? ''}/manage/equipment" style="color:#E85D04">管理画面で確認する →</a></p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p style="color:#9ca3af;font-size:12px">このメールは建設DXから自動送信されています。</p>
</div>`,
      }).catch(() => {})
    }

    notifiedCount++
  }

  return NextResponse.json({
    checked: equipment.length,
    notified: notifiedCount,
  })
}
