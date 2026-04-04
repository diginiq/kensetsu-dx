import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendMail } from '@/lib/mail'
import { notifyUser } from '@/lib/appNotifications'

// 毎日17〜18時頃に外部cronサービスから呼び出す
// Authorization: Bearer CRON_SECRET
export async function POST(req: Request) {
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // アクティブ会社の全ワーカーを取得
  const workers = await prisma.user.findMany({
    where: {
      role: 'WORKER',
      isActive: true,
      company: { status: { not: 'SUSPENDED' } },
    },
    select: {
      id: true,
      name: true,
      email: true,
      companyId: true,
    },
  })

  // 今日すでに日報を提出または承認済みのユーザーID
  const submittedUserIds = new Set(
    (
      await prisma.dailyReport.findMany({
        where: {
          reportDate: { gte: today, lt: tomorrow },
          status: { in: ['SUBMITTED', 'APPROVED'] },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
    ).map((r) => r.userId)
  )

  // 今日担当現場がある（アクティブ現場に配属）ワーカーに絞る
  const assignedUserIds = new Set(
    (
      await prisma.siteAssignment.findMany({
        where: {
          site: { status: 'ACTIVE' },
        },
        select: { userId: true },
        distinct: ['userId'],
      })
    ).map((a) => a.userId)
  )

  const unsubmittedWorkers = workers.filter(
    (w) => assignedUserIds.has(w.id) && !submittedUserIds.has(w.id)
  )

  let notifiedCount = 0

  for (const worker of unsubmittedWorkers) {
    // アプリ内通知 + プッシュ通知
    notifyUser(worker.id, {
      title: '📋 日報を提出してください',
      body: `本日の日報がまだ提出されていません。退勤前にご記入ください。`,
      url: '/app/reports/new',
    }).catch(() => {})

    // メール通知（アドレスがある場合）
    if (worker.email) {
      sendMail({
        to: worker.email,
        subject: '【建設DX】本日の日報が未提出です',
        html: `
          <p>${worker.name} さん</p>
          <p>本日の日報がまだ提出されていません。</p>
          <p>退勤前に日報アプリから記入・提出してください。</p>
          <p><a href="${process.env.NEXTAUTH_URL ?? ''}/app/reports/new">日報を記入する →</a></p>
        `,
      }).catch(() => {})
    }

    notifiedCount++
  }

  return NextResponse.json({
    total: workers.length,
    notified: notifiedCount,
    date: today.toISOString().split('T')[0],
  })
}
