import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { AlertTriangle, AlertCircle, FileText, Clock } from 'lucide-react'

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
  const in60Days = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
  const in30Days = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const [
    company,
    siteCount,
    workerCount,
    photoCount,
    pendingReportCount,
    submittedReportCount,
    totalReportCount,
    expiredQualCount,
    expiringQualCount,
  ] = await Promise.all([
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true, status: true, plan: true, planExpiresAt: true },
    }),
    prisma.site.count({ where: { companyId, status: { not: 'ARCHIVED' } } }),
    prisma.user.count({ where: { companyId, role: 'WORKER', isActive: true } }),
    prisma.photo.count({ where: { site: { companyId } } }),
    // 承認待ち日報（今月）
    prisma.dailyReport.count({
      where: { site: { companyId }, status: 'SUBMITTED' },
    }),
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
    // 期限切れ資格
    prisma.workerQualification.count({
      where: {
        user: { companyId, isActive: true },
        expiresDate: { not: null, lt: new Date() },
      },
    }),
    // 30日以内に期限切れになる資格
    prisma.workerQualification.count({
      where: {
        user: { companyId, isActive: true },
        expiresDate: { not: null, gte: new Date(), lte: in30Days },
      },
    }),
  ])

  const PLAN_MAP: Record<string, string> = { FREE: '無料プラン', STANDARD: 'スタンダード', PREMIUM: 'プレミアム' }
  const reportSubmitRate = totalReportCount > 0
    ? Math.round((submittedReportCount / totalReportCount) * 100)
    : null

  // 要対応アラート
  const alerts: { href: string; label: string; count: number; level: 'error' | 'warning' | 'info' }[] = []
  if (pendingReportCount > 0) {
    alerts.push({ href: '/manage/reports', label: '承認待ちの日報', count: pendingReportCount, level: 'info' })
  }
  if (expiredQualCount > 0) {
    alerts.push({ href: '/manage/workers/qualifications', label: '期限切れの資格', count: expiredQualCount, level: 'error' })
  }
  if (expiringQualCount > 0) {
    alerts.push({ href: '/manage/workers/qualifications', label: '30日以内に期限切れの資格', count: expiringQualCount, level: 'warning' })
  }

  const quickLinks = [
    { href: '/manage/workers', label: '従業員管理', desc: '従業員の追加・編集' },
    { href: '/manage/sites', label: '現場管理', desc: '現場の登録・割り当て' },
    { href: '/manage/reports', label: '日報管理', desc: '日報の確認・承認' },
    { href: '/manage/overtime', label: '労働時間', desc: '36協定・残業管理' },
    { href: '/manage/attendance', label: '出面表', desc: '月次出勤カレンダー' },
    { href: '/manage/safety', label: '安全書類', desc: '書類の作成・管理' },
    { href: '/manage/company', label: '会社情報', desc: '会社情報の編集' },
    { href: '/manage/billing', label: '課金管理', desc: 'プラン・お支払い' },
  ]

  const alertColors = {
    error: { bg: 'bg-red-50 border-red-200 hover:bg-red-100', icon: 'text-red-500', text: 'text-red-700', badge: 'bg-red-500' },
    warning: { bg: 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100', icon: 'text-yellow-500', text: 'text-yellow-700', badge: 'bg-yellow-500' },
    info: { bg: 'bg-blue-50 border-blue-200 hover:bg-blue-100', icon: 'text-blue-500', text: 'text-blue-700', badge: 'bg-blue-500' },
  }

  const alertIcons = {
    error: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
    info: <FileText className="w-5 h-5" />,
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">ダッシュボード</h1>

      {/* 要対応セクション */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide">要対応</h2>
          {alerts.map((alert) => {
            const c = alertColors[alert.level]
            return (
              <Link
                key={`${alert.href}-${alert.label}`}
                href={alert.href}
                className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-colors ${c.bg}`}
              >
                <div className={`flex items-center gap-3 ${c.text}`}>
                  <span className={c.icon}>{alertIcons[alert.level]}</span>
                  <span className="font-medium text-sm">{alert.label}</span>
                </div>
                <span className={`${c.badge} text-white text-sm font-bold px-2.5 py-0.5 rounded-full`}>
                  {alert.count}件
                </span>
              </Link>
            )
          })}
        </div>
      )}

      {/* 統計カード */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">現場数</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#E85D04' }}>{siteCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">ワーカー数</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#455A64' }}>{workerCount}</p>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500">撮影枚数（累計）</p>
          <p className="text-3xl font-bold mt-1" style={{ color: '#2E7D32' }}>{photoCount.toLocaleString('ja-JP')}</p>
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
        {pendingReportCount > 0 && (
          <Link href="/manage/reports" className="bg-white rounded-xl p-5 shadow-sm border border-blue-200 hover:border-blue-300 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-500" />
              <p className="text-sm text-gray-500">承認待ち日報</p>
            </div>
            <p className="text-3xl font-bold text-blue-600">{pendingReportCount}</p>
            <p className="text-xs text-gray-400 mt-1">タップして確認</p>
          </Link>
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
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">メニュー</h2>
        <div className="grid grid-cols-2 gap-3">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:border-orange-300 transition-colors"
            >
              <p className="font-bold text-gray-800 text-sm">{link.label}</p>
              <p className="text-xs text-gray-500 mt-1">{link.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
