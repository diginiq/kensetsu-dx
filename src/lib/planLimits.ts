import { prisma } from '@/lib/db'

export const PLAN_LIMITS = {
  FREE:     { sites: 3,        workers: 5,         storageLimitGb: 1   },
  STANDARD: { sites: 20,       workers: 20,         storageLimitGb: 50  },
  PREMIUM:  { sites: Infinity, workers: Infinity,   storageLimitGb: 500 },
}

export async function checkSiteLimit(companyId: string): Promise<string | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true, _count: { select: { sites: true } } },
  })
  if (!company) return '会社情報が見つかりません'
  const limit = PLAN_LIMITS[company.plan as keyof typeof PLAN_LIMITS]?.sites ?? 3
  if (limit === Infinity) return null
  const current = company._count.sites
  if (current >= limit) {
    return `現在のプラン（${company.plan}）では現場を${limit}件までしか登録できません。アップグレードしてください。`
  }
  return null
}

export async function checkWorkerLimit(companyId: string): Promise<string | null> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true },
  })
  if (!company) return '会社情報が見つかりません'
  const limit = PLAN_LIMITS[company.plan as keyof typeof PLAN_LIMITS]?.workers ?? 5
  if (limit === Infinity) return null
  const current = await prisma.user.count({
    where: { companyId, role: 'WORKER', isActive: true },
  })
  if (current >= limit) {
    return `現在のプラン（${company.plan}）では従業員を${limit}名までしか登録できません。アップグレードしてください。`
  }
  return null
}
