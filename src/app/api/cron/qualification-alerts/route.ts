import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendMail, qualificationExpiryHtml } from '@/lib/mail'
import { notifyUsers } from '@/lib/appNotifications'

// 外部cronサービス（Vercel Cron, GitHub Actions等）から呼び出す
// Authorization: Bearer CRON_SECRET
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const now = new Date()
  const threshold = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30日後

  // 期限切れ・30日以内に期限が来る資格を全会社分取得
  const qualifications = await prisma.workerQualification.findMany({
    where: {
      user: { isActive: true },
      expiresDate: { not: null, lte: threshold },
    },
    include: {
      user: {
        select: {
          name: true,
          companyId: true,
          company: {
            select: {
              id: true,
              name: true,
              users: {
                where: { role: 'COMPANY_ADMIN', isActive: true },
                select: { id: true, email: true, name: true },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { expiresDate: 'asc' },
  })

  if (qualifications.length === 0) {
    return NextResponse.json({ sent: 0, message: '対象なし' })
  }

  // 会社ごとにグループ化
  type QualEntry = {
    userName: string
    name: string
    expiresDate: string
    daysUntilExpiry: number
  }
  const byCompany = new Map<
    string,
    { companyName: string; adminEmail: string; adminId: string; items: QualEntry[] }
  >()

  for (const q of qualifications) {
    const company = q.user.company
    if (!company) continue
    const admin = company.users[0]
    if (!admin) continue

    const existing = byCompany.get(company.id)
    const diffDays = Math.ceil(
      (new Date(q.expiresDate!).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
    )
    const entry: QualEntry = {
      userName: q.user.name,
      name: q.name,
      expiresDate: q.expiresDate!.toISOString(),
      daysUntilExpiry: diffDays,
    }

    if (existing) {
      existing.items.push(entry)
    } else {
      byCompany.set(company.id, {
        companyName: company.name,
        adminEmail: admin.email,
        adminId: admin.id,
        items: [entry],
      })
    }
  }

  let sentCount = 0
  const errors: string[] = []

  for (const [, { companyName, adminEmail, adminId, items }] of byCompany) {
    const expiredCount = items.filter((i) => i.daysUntilExpiry < 0).length

    // アプリ内通知 + プッシュ + LINE
    notifyUsers([adminId], {
      title: expiredCount > 0 ? `⚠️ 資格期限超過 ${expiredCount}件` : `📋 資格期限が近づいています`,
      body: `${items.length}件の資格を確認してください`,
      url: '/manage/workers/qualifications',
    }).catch(() => {})

    // メール通知
    try {
      await sendMail({
        to: adminEmail,
        subject: `【建設DX】資格期限アラート（${items.length}件）`,
        html: qualificationExpiryHtml(companyName, items),
      })
      sentCount++
    } catch (e: unknown) {
      errors.push(`${companyName}: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  return NextResponse.json({
    sent: sentCount,
    total: byCompany.size,
    errors: errors.length > 0 ? errors : undefined,
  })
}
