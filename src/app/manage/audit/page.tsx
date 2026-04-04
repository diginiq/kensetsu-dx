import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const ACTION_LABEL: Record<string, string> = {
  APPROVE_REPORT: '日報承認',
  REJECT_REPORT: '日報差し戻し',
  APPROVE_LEAVE: '休暇申請承認',
  REJECT_LEAVE: '休暇申請却下',
  APPROVE_AMEND: '打刻修正承認',
  REJECT_AMEND: '打刻修正却下',
  CREATE_ANNOUNCEMENT: 'お知らせ作成',
  DELETE_ANNOUNCEMENT: 'お知らせ削除',
  UPDATE_COMPANY: '会社情報更新',
  UPLOAD_LOGO: 'ロゴアップロード',
  CREATE_WORK_PLAN: '作業計画作成',
  ACTIVATE_WORKER: '従業員有効化',
  DEACTIVATE_WORKER: '従業員無効化',
  CREATE_SITE: '現場作成',
  UPDATE_SITE: '現場更新',
  CLOSE_HAZARD: 'ヒヤリハット対応済み',
}

const ACTION_COLORS: Record<string, string> = {
  APPROVE_REPORT: 'bg-green-100 text-green-700',
  REJECT_REPORT: 'bg-red-100 text-red-700',
  APPROVE_LEAVE: 'bg-green-100 text-green-700',
  REJECT_LEAVE: 'bg-red-100 text-red-700',
  APPROVE_AMEND: 'bg-green-100 text-green-700',
  REJECT_AMEND: 'bg-red-100 text-red-700',
  UPLOAD_LOGO: 'bg-blue-100 text-blue-700',
  CREATE_WORK_PLAN: 'bg-orange-100 text-orange-700',
  DEACTIVATE_WORKER: 'bg-red-100 text-red-700',
}

export default async function AuditPage() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    redirect('/login')
  }

  const logs = await prisma.auditLog.findMany({
    where: { companyId: session.user.companyId },
    include: { user: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">操作ログ</h1>
        <p className="text-sm text-gray-500 mt-0.5">管理者の操作履歴（直近100件）</p>
      </div>

      {logs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          操作ログがありません
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['日時', '操作者', '操作内容', '対象'].map((h) => (
                  <th key={h} className="text-left py-2.5 px-4 text-xs text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="py-2.5 px-4 text-xs text-gray-400 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString('ja-JP', {
                      month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </td>
                  <td className="py-2.5 px-4 text-sm text-gray-700">{log.user?.name ?? '—'}</td>
                  <td className="py-2.5 px-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {ACTION_LABEL[log.action] ?? log.action}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-xs text-gray-500">
                    {log.target && `${log.target}`}
                    {log.targetId && ` #${log.targetId.slice(-6)}`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
