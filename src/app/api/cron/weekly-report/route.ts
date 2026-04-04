import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendMail } from '@/lib/mail'

// 毎週月曜日に呼び出す（先週月〜日の集計）
// Authorization: Bearer CRON_SECRET
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const now = new Date()
  // 先週月曜日 00:00:00
  const dayOfWeek = now.getDay() // 0=日, 1=月,...
  const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1
  const lastMonday = new Date(now)
  lastMonday.setDate(now.getDate() - daysToLastMonday - 7)
  lastMonday.setHours(0, 0, 0, 0)
  // 先週日曜日 23:59:59
  const lastSunday = new Date(lastMonday)
  lastSunday.setDate(lastMonday.getDate() + 6)
  lastSunday.setHours(23, 59, 59, 999)

  const weekLabel = `${lastMonday.toLocaleDateString('ja-JP')} 〜 ${lastSunday.toLocaleDateString('ja-JP')}`

  // アクティブな会社一覧（アドミン付き）
  const companies = await prisma.company.findMany({
    where: { status: { in: ['TRIAL', 'ACTIVE'] } },
    select: {
      id: true,
      name: true,
      users: {
        where: { role: 'COMPANY_ADMIN', isActive: true },
        select: { id: true, email: true },
        take: 1,
      },
    },
  })

  let sentCount = 0

  for (const company of companies) {
    const admin = company.users[0]
    if (!admin?.email) continue

    // 当週アクティブな現場
    const sites = await prisma.site.findMany({
      where: {
        companyId: company.id,
        status: { in: ['ACTIVE', 'COMPLETED'] },
      },
      select: { id: true, name: true },
    })

    if (sites.length === 0) continue
    const siteIds = sites.map((s) => s.id)

    // 各集計を並列取得
    const [reports, photos, hazards, kySubmissions] = await Promise.all([
      prisma.dailyReport.findMany({
        where: {
          siteId: { in: siteIds },
          reportDate: { gte: lastMonday, lte: lastSunday },
          status: 'APPROVED',
        },
        select: { siteId: true, reportDate: true, userId: true },
      }),
      prisma.photo.findMany({
        where: {
          siteId: { in: siteIds },
          createdAt: { gte: lastMonday, lte: lastSunday },
        },
        select: { siteId: true },
      }),
      prisma.hazardReport.findMany({
        where: {
          companyId: company.id,
          occurredAt: { gte: lastMonday, lte: lastSunday },
        },
        select: { siteId: true, severity: true, type: true },
      }),
      prisma.kYSubmission.findMany({
        where: {
          companyId: company.id,
          createdAt: { gte: lastMonday, lte: lastSunday },
        },
        select: { siteId: true },
      }),
    ])

    // 現場ごとに集計
    const siteStats = sites.map((site) => {
      const siteReports = reports.filter((r) => r.siteId === site.id)
      const sitePhotos = photos.filter((p) => p.siteId === site.id)
      const siteHazards = hazards.filter((h) => h.siteId === site.id)
      const siteKY = kySubmissions.filter((k) => k.siteId === site.id)
      const highHazards = siteHazards.filter((h) => h.severity === 'HIGH')

      return {
        name: site.name,
        reportCount: siteReports.length,
        photoCount: sitePhotos.length,
        hazardCount: siteHazards.length,
        highHazardCount: highHazards.length,
        kyCount: siteKY.length,
      }
    }).filter((s) => s.reportCount > 0 || s.photoCount > 0 || s.hazardCount > 0 || s.kyCount > 0)

    if (siteStats.length === 0) continue

    // 合計
    const totals = siteStats.reduce(
      (acc, s) => ({
        reports: acc.reports + s.reportCount,
        photos: acc.photos + s.photoCount,
        hazards: acc.hazards + s.hazardCount,
        ky: acc.ky + s.kyCount,
      }),
      { reports: 0, photos: 0, hazards: 0, ky: 0 }
    )

    const highHazardTotal = siteStats.reduce((acc, s) => acc + s.highHazardCount, 0)

    const siteRows = siteStats.map((s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb">${s.name}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${s.reportCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${s.photoCount}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
          ${s.hazardCount > 0
            ? `<span style="color:${s.highHazardCount > 0 ? '#dc2626' : '#d97706'}">${s.hazardCount}${s.highHazardCount > 0 ? ` (重大${s.highHazardCount})` : ''}</span>`
            : '0'}
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #e5e7eb;text-align:center">${s.kyCount}</td>
      </tr>
    `).join('')

    await sendMail({
      to: admin.email,
      subject: `【建設DX】週次レポート（${weekLabel}）`,
      html: `
<div style="font-family:sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <h2 style="color:#E85D04;margin-bottom:4px">📊 週次活動レポート</h2>
  <p style="color:#6b7280;font-size:14px;margin-bottom:20px">${weekLabel}</p>
  <p style="color:#374151">${company.name} 管理者様</p>

  <!-- サマリーカード -->
  <div style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap">
    <div style="flex:1;min-width:120px;background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;text-align:center">
      <p style="margin:0;font-size:28px;font-weight:bold;color:#E85D04">${totals.reports}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#9a3412">日報（承認済）</p>
    </div>
    <div style="flex:1;min-width:120px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:12px;text-align:center">
      <p style="margin:0;font-size:28px;font-weight:bold;color:#1d4ed8">${totals.photos}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#1e3a8a">現場写真</p>
    </div>
    <div style="flex:1;min-width:120px;background:${highHazardTotal > 0 ? '#fef2f2' : '#fefce8'};border:1px solid ${highHazardTotal > 0 ? '#fecaca' : '#fde68a'};border-radius:8px;padding:12px;text-align:center">
      <p style="margin:0;font-size:28px;font-weight:bold;color:${highHazardTotal > 0 ? '#dc2626' : '#d97706'}">${totals.hazards}</p>
      <p style="margin:4px 0 0;font-size:12px;color:${highHazardTotal > 0 ? '#991b1b' : '#92400e'}">ヒヤリハット</p>
    </div>
    <div style="flex:1;min-width:120px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;text-align:center">
      <p style="margin:0;font-size:28px;font-weight:bold;color:#16a34a">${totals.ky}</p>
      <p style="margin:4px 0 0;font-size:12px;color:#14532d">KY活動</p>
    </div>
  </div>

  ${highHazardTotal > 0 ? `
  <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:12px;margin:16px 0">
    <p style="margin:0;color:#dc2626;font-weight:bold">⚠️ 重大度「高」のヒヤリハットが ${highHazardTotal} 件あります。速やかに確認・対処してください。</p>
  </div>` : ''}

  <!-- 現場別内訳 -->
  <h3 style="color:#374151;margin:20px 0 8px;font-size:15px">現場別内訳</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <thead>
      <tr style="background:#f9fafb">
        <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:500">現場名</th>
        <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500">日報</th>
        <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500">写真</th>
        <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500">ヒヤリハット</th>
        <th style="padding:8px 12px;text-align:center;color:#6b7280;font-weight:500">KY</th>
      </tr>
    </thead>
    <tbody>${siteRows}</tbody>
  </table>

  <p style="margin:20px 0 8px">
    <a href="${process.env.NEXTAUTH_URL ?? ''}/manage" style="color:#E85D04;font-size:14px">管理画面で詳細を確認する →</a>
  </p>

  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p style="color:#9ca3af;font-size:12px">このメールは建設DXから自動送信されています（毎週月曜日）。</p>
</div>`,
    }).catch(() => {})

    sentCount++
  }

  return NextResponse.json({
    week: weekLabel,
    sent: sentCount,
  })
}
