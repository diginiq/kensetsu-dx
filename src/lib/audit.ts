import { prisma } from '@/lib/db'

export type AuditAction =
  | 'APPROVE_REPORT'
  | 'REJECT_REPORT'
  | 'APPROVE_LEAVE'
  | 'REJECT_LEAVE'
  | 'APPROVE_AMEND'
  | 'REJECT_AMEND'
  | 'CREATE_ANNOUNCEMENT'
  | 'DELETE_ANNOUNCEMENT'
  | 'UPDATE_COMPANY'
  | 'UPLOAD_LOGO'
  | 'CREATE_WORK_PLAN'
  | 'ACTIVATE_WORKER'
  | 'DEACTIVATE_WORKER'
  | 'CREATE_SITE'
  | 'UPDATE_SITE'
  | 'CLOSE_HAZARD'

export async function writeAuditLog(params: {
  companyId?: string | null
  userId?: string | null
  action: AuditAction
  target?: string
  targetId?: string
  detail?: Record<string, unknown>
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        companyId: params.companyId ?? null,
        userId: params.userId ?? null,
        action: params.action,
        target: params.target ?? null,
        targetId: params.targetId ?? null,
        detail: params.detail ? (params.detail as object) : undefined,
      },
    })
  } catch {
    // 監査ログ失敗は本処理に影響させない
  }
}
