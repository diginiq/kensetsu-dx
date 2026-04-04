import { prisma } from '@/lib/db'
import { AI_MONTHLY_LIMITS, isPlanAIEnabled } from '@/lib/roles'

/**
 * 月次AI使用量をチェックし、制限内なら使用ログを記録
 * @returns エラーメッセージ（null なら使用可能）
 */
export async function checkAndLogAIUsage(params: {
  companyId: string
  userId: string
  feature: string
  tokens?: number
  durationSec?: number
}): Promise<string | null> {
  // 会社のプランを取得
  const company = await prisma.company.findUnique({
    where: { id: params.companyId },
    select: { plan: true },
  })
  if (!company) return '会社情報が見つかりません'

  if (!isPlanAIEnabled(company.plan)) {
    return 'AI機能はスタンダードプラン以上でご利用いただけます。プランをアップグレードしてください。'
  }

  const limit = AI_MONTHLY_LIMITS[company.plan] ?? 0

  // 今月の使用回数を確認
  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const usageCount = await prisma.aIUsageLog.count({
    where: {
      companyId: params.companyId,
      feature: params.feature,
      createdAt: { gte: startOfMonth },
    },
  })

  if (usageCount >= limit) {
    return `今月のAI使用回数上限（${limit}回）に達しました。プランをアップグレードしてください。`
  }

  // 使用ログを記録
  await prisma.aIUsageLog.create({
    data: {
      companyId: params.companyId,
      userId: params.userId,
      feature: params.feature,
      tokens: params.tokens ?? null,
      durationSec: params.durationSec ?? null,
    },
  })

  return null
}

/** 今月の残り使用回数を取得 */
export async function getRemainingAIUsage(companyId: string, feature: string): Promise<{ used: number; limit: number; remaining: number }> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { plan: true },
  })
  const limit = AI_MONTHLY_LIMITS[company?.plan ?? 'FREE'] ?? 5

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const used = await prisma.aIUsageLog.count({
    where: { companyId, feature, createdAt: { gte: startOfMonth } },
  })

  return { used, limit, remaining: Math.max(0, limit - used) }
}
