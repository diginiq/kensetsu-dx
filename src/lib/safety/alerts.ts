import { prisma } from '@/lib/db'

interface NewEntryAlert {
  userId: string
  userName: string
  siteId: string
  siteName: string
  firstEntryDate: Date
}

/**
 * 新規入場者を自動検知する。
 * TimeEntry（出勤打刻）または DailyReport（日報）で初めて記録された
 * 現場とユーザーの組み合わせのうち、SafetyDocument（NEW_ENTRY_SURVEY）が
 * まだ作成されていないものを抽出する。
 */
export async function detectNewEntries(companyId: string): Promise<NewEntryAlert[]> {
  const recentEntries = await prisma.timeEntry.findMany({
    where: {
      user: { companyId },
      type: 'CLOCK_IN',
      timestamp: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
    },
    select: {
      userId: true,
      siteId: true,
      timestamp: true,
      user: { select: { name: true } },
      site: { select: { name: true } },
    },
    orderBy: { timestamp: 'asc' },
  })

  const firstEntryMap = new Map<string, { userId: string; siteId: string; userName: string; siteName: string; timestamp: Date }>()

  for (const entry of recentEntries) {
    const key = `${entry.userId}-${entry.siteId}`
    if (!firstEntryMap.has(key)) {
      firstEntryMap.set(key, {
        userId: entry.userId,
        siteId: entry.siteId,
        userName: entry.user.name,
        siteName: entry.site.name,
        timestamp: entry.timestamp,
      })
    }
  }

  const existingSurveys = await prisma.safetyDocument.findMany({
    where: {
      companyId,
      documentType: 'NEW_ENTRY_SURVEY',
    },
    select: {
      siteId: true,
      data: true,
    },
  })

  const coveredKeys = new Set<string>()
  for (const survey of existingSurveys) {
    const surveyData = survey.data as Record<string, unknown>
    const workers = (surveyData.workers as Array<{ name: string }>) ?? []
    for (const w of workers) {
      coveredKeys.add(`${w.name}-${survey.siteId}`)
    }
  }

  const alerts: NewEntryAlert[] = []
  for (const [, entry] of firstEntryMap) {
    const nameKey = `${entry.userName}-${entry.siteId}`
    if (!coveredKeys.has(nameKey)) {
      const allEntries = await prisma.timeEntry.count({
        where: {
          userId: entry.userId,
          siteId: entry.siteId,
          type: 'CLOCK_IN',
          timestamp: { lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      })
      if (allEntries === 0) {
        alerts.push({
          userId: entry.userId,
          userName: entry.userName,
          siteId: entry.siteId,
          siteName: entry.siteName,
          firstEntryDate: entry.timestamp,
        })
      }
    }
  }

  return alerts
}

interface QualificationAlert {
  userId: string
  userName: string
  qualificationName: string
  expiresDate: Date
  daysUntilExpiry: number
  isExpired: boolean
}

/**
 * 資格期限アラートを取得する。
 * 30日以内に期限切れ、または既に期限切れの資格を抽出。
 */
export async function getQualificationAlerts(companyId: string): Promise<QualificationAlert[]> {
  const now = new Date()
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const qualifications = await prisma.workerQualification.findMany({
    where: {
      user: { companyId },
      expiresDate: { lte: thirtyDaysLater },
    },
    include: { user: { select: { name: true } } },
    orderBy: { expiresDate: 'asc' },
  })

  return qualifications.map((q) => {
    const expiresDate = q.expiresDate!
    const diffMs = expiresDate.getTime() - now.getTime()
    const daysUntilExpiry = Math.ceil(diffMs / (24 * 60 * 60 * 1000))

    return {
      userId: q.userId,
      userName: q.user.name,
      qualificationName: q.name,
      expiresDate,
      daysUntilExpiry,
      isExpired: daysUntilExpiry < 0,
    }
  })
}
