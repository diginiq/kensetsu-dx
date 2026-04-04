import nodemailer from 'nodemailer'

const isConfigured = !!process.env.SMTP_HOST

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS ?? '' }
      : undefined,
  })
}

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string
  subject: string
  html: string
}): Promise<void> {
  if (!isConfigured) return // SMTP未設定時はサイレントスキップ
  const transporter = createTransporter()
  await transporter.sendMail({
    from: process.env.SMTP_FROM ?? '建設DX <noreply@kensetsu-dx.jp>',
    to,
    subject,
    html,
  })
}

// --- メールテンプレート ---

export function reportApprovedHtml(workerName: string, reportDate: Date, siteName: string): string {
  const dateStr = reportDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  return `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#2E7D32;margin-bottom:8px">✓ 日報が承認されました</h2>
  <p style="color:#374151">${workerName} さん</p>
  <p style="color:#374151"><strong>${dateStr}</strong>（${siteName}）の日報が承認されました。</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p style="color:#9ca3af;font-size:12px">このメールは建設DXから自動送信されています。</p>
</div>`
}

export function reportRejectedHtml(
  workerName: string,
  reportDate: Date,
  siteName: string,
  reason?: string | null,
): string {
  const dateStr = reportDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  return `
<div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px">
  <h2 style="color:#dc2626;margin-bottom:8px">⚠ 日報が差し戻されました</h2>
  <p style="color:#374151">${workerName} さん</p>
  <p style="color:#374151"><strong>${dateStr}</strong>（${siteName}）の日報が差し戻されました。</p>
  ${reason ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin:16px 0"><p style="color:#b91c1c;margin:0"><strong>差し戻し理由：</strong>${reason}</p></div>` : ''}
  <p style="color:#374151">アプリからご確認のうえ、修正して再提出してください。</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p style="color:#9ca3af;font-size:12px">このメールは建設DXから自動送信されています。</p>
</div>`
}

export function overtimeAlertHtml(
  companyName: string,
  items: Array<{ name: string; monthlyOvertimeHours: number; yearlyOvertimeHours: number; monthlyLimit: number; yearlyLimit: number }>,
  year: number,
  month: number,
): string {
  const rows = items.map((i) => {
    const monthPct = Math.round((i.monthlyOvertimeHours / i.monthlyLimit) * 100)
    const color = i.monthlyOvertimeHours >= i.monthlyLimit ? '#dc2626' : '#d97706'
    return `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${i.name}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:${color};font-weight:bold">${i.monthlyOvertimeHours}時間</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${i.monthlyLimit}時間</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;color:${color}">${monthPct}%</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${i.yearlyOvertimeHours}時間 / ${i.yearlyLimit}時間</td></tr>`
  }).join('')

  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#dc2626;margin-bottom:8px">🚨 36協定 残業時間アラート</h2>
  <p style="color:#374151">${companyName} 管理者様</p>
  <p style="color:#374151">${year}年${month}月の残業時間が上限に近づいている従業員がいます。</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:left">氏名</th><th style="padding:8px;text-align:left">今月残業</th><th style="padding:8px;text-align:left">月間上限</th><th style="padding:8px;text-align:left">使用率</th><th style="padding:8px;text-align:left">年間残業 / 年間上限</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#374151">管理画面の「労働時間」から詳細を確認してください。</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p style="color:#9ca3af;font-size:12px">このメールは建設DXから自動送信されています。</p>
</div>`
}

export function qualificationExpiryHtml(
  companyName: string,
  items: Array<{ userName: string; name: string; expiresDate: string; daysUntilExpiry: number }>,
): string {
  const rows = items.map((i) => {
    const label = i.daysUntilExpiry < 0
      ? `<span style="color:#dc2626;font-weight:bold">期限超過 ${Math.abs(i.daysUntilExpiry)}日</span>`
      : i.daysUntilExpiry <= 30
      ? `<span style="color:#d97706;font-weight:bold">あと${i.daysUntilExpiry}日</span>`
      : `<span style="color:#92400e">あと${i.daysUntilExpiry}日</span>`
    return `<tr><td style="padding:8px;border-bottom:1px solid #e5e7eb">${i.userName}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${i.name}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${new Date(i.expiresDate).toLocaleDateString('ja-JP')}</td><td style="padding:8px;border-bottom:1px solid #e5e7eb">${label}</td></tr>`
  }).join('')

  return `
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
  <h2 style="color:#d97706;margin-bottom:8px">⚠ 資格期限アラート</h2>
  <p style="color:#374151">${companyName} 管理者様</p>
  <p style="color:#374151">以下の資格・免許の期限が近づいています（または超過しています）。</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
    <thead><tr style="background:#f9fafb"><th style="padding:8px;text-align:left">氏名</th><th style="padding:8px;text-align:left">資格名</th><th style="padding:8px;text-align:left">有効期限</th><th style="padding:8px;text-align:left">残日数</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <p style="color:#374151">管理画面の「資格期限管理」から詳細を確認してください。</p>
  <hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0">
  <p style="color:#9ca3af;font-size:12px">このメールは建設DXから自動送信されています。</p>
</div>`
}
