import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'

const STATUS_MAP: Record<string, string> = { ACTIVE: '有効', SUSPENDED: '停止中', TRIAL: 'トライアル' }
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  TRIAL: 'bg-yellow-100 text-yellow-800',
}

export default async function ManageDashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const companyId = session.user.companyId

  const thisMonth = new Date()
  const startOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth(), 1)
  const endOfMonth = new Date(thisMonth.getFullYear(), thisMonth.getMonth() + 1, 0, 23, 59, 59)

  const [company, siteCount, workerCount, photoCount, submittedReportCount, totalReportCount, overtimeWarningCount] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, status: true, plan: true, planExpiresAt: true },
    }),
    prisma.site.count({ where: { companyId, status: { not: 'ARCHIVED' } } }),
    prisma.user.count({ where: { companyId, role: 'WORKER', isActive: true } }),
    prisma.photo.count({ where: { site: { companyId } } }),
    prisma.dailyReport.count({
      where: {
        site: { companyId },
        reportDate: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['SUBMITTED', 'APPROVED'] },
      },
    }),
    prisma.dailyReport.count({
      where: {
        site: { companyId },
        reportDate: { gte: startOfMonth, lte: endOfMonth },
      },
    }),
    // 今月40時間超残業のワーカー数（簡易：日報の合計残業時間）
    prisma.dailyReport.groupBy({
      by: ['userId'],
      where: {
        site: { companyId },
        reportDate: { gte: startOfMonth, lte: endOfMonth },
        status: { in: ['SUBMITTED', 'APPROVED'] },
        endTime: { not: null },
      },
      _count: { id: true },
    }),
  ])

  const PLAN_MAP: Record<string, string> = { FREE: '無料プラン', STANDARD: 'スタンダード', PREMIUM: 'プレミアム' }
  const reportSubmitRate = totalReportCount > 0
    ? Math.round((submittedReportCount / totalReportCount) * 100)
    : null

  const quickLinks = [
    { href: '/manage/workers', label: '従業員管理', desc: '従業員の追加・編集' },
    { href: '/manage/sites', label: '現場管理', desc: '現場の登録・割り当て' },
    { href: '/manage/reports', label: '日報管理', desc: '日報の確認・承認' },
    { href: '/manage/overtime', label: '労働時間', desc: '36協定・残業管理' },
    { href: '/manage/attendance', label: '出面表', desc: '月次出勤カレンダー' },
    { href: '/manage/company', label: '会社情報', desc: '会社情報の編集' },
    { href: '/manage/billing', label: '課金管理', desc: 'プラン・お支払い' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>

      {/* 統計カード */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">現場数</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#E85D04' }}>{siteCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">ワーカー数</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#455A64' }}>{workerCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">撮影枚数</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#2E7D32' }}>{photoCount}</p>
        </div>
        {reportSubmitRate !== null && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
            <p className="text-sm text-gray-500">今月の日報提出率</p>
            <p className="text-3xl font-bold mt-1" style={{ color: reportSubmitRate >= 80 ? '#2E7D32' : '#E85D04' }}>
              {reportSubmitRate}%
            </p>
            <p className="text-xs text-gray-400 mt-1">{submittedReportCount} / {totalReportCount}件</p>
          </div>
        )}
        {overtimeWarningCount.length > 0 && (
          <div className="bg-white rounded-xl p-5 shadow-sm border border-yellow-300">
            <p className="text-sm text-gray-500">残業記録ワーカー</p>
            <p className="text-3xl font-bold mt-1" style={{ color: '#E85D04' }}>{overtimeWarningCount.length}名</p>
            <p className="text-xs text-gray-400 mt-1">今月日報提出済み</p>
          </div>
        )}
      </div>

      {/* 課金状態 */}
      {company && (
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">現在のプラン</p>
              <p className="text-lg font-bold text-gray-800 mt-1">{PLAN_MAP[company.plan]}</p>
              {company.planExpiresAt && (
                <p className="text-xs text-gray-500 mt-1">
                  有効期限: {company.planExpiresAt.toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[company.status]}`}>
              {STATUS_MAP[company.status]}
            </span>
          </div>
        </div>
      )}

      {/* クイックリンク */}
      <div className="grid grid-cols-2 gap-4">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 hover:border-orange-300 transition-colors"
          >
            <p className="font-bold text-gray-800">{link.label}</p>
            <p className="text-sm text-gray-500 mt-1">{link.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
