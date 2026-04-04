/**
 * ロール権限ヘルパー
 */

export type AppRole = 'SUPER_ADMIN' | 'COMPANY_ADMIN' | 'SITE_SUPERVISOR' | 'FOREMAN' | 'WORKER'

/** 会社管理者またはシステム管理者 */
export function isCompanyAdmin(role: string): boolean {
  return role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN'
}

/** AI音声日報・日報作成が可能なロール */
export function canCreateAIReport(role: string): boolean {
  return role === 'FOREMAN' || role === 'SITE_SUPERVISOR' || role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN'
}

/** 日報の承認権限（COMPANY_ADMIN + SITE_SUPERVISOR） */
export function canApproveReport(role: string): boolean {
  return role === 'COMPANY_ADMIN' || role === 'SITE_SUPERVISOR' || role === 'SUPER_ADMIN'
}

/** 管理画面アクセス可能ロール */
export function canAccessManage(role: string): boolean {
  return role === 'COMPANY_ADMIN' || role === 'SUPER_ADMIN'
}

/** AIプラン制限チェック用の月次上限（FREE/TRIALはAI機能利用不可） */
export const AI_MONTHLY_LIMITS: Record<string, number> = {
  FREE: 0,
  TRIAL: 0,
  STANDARD: 100,
  PREMIUM: 99999,
}

/** AI機能が使用可能なプランか */
export function isPlanAIEnabled(plan: string): boolean {
  return plan === 'STANDARD' || plan === 'PREMIUM'
}
