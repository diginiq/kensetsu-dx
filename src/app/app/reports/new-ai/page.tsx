import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { canCreateAIReport, isPlanAIEnabled } from '@/lib/roles'
import { prisma } from '@/lib/db'
import { getRemainingAIUsage } from '@/lib/aiUsage'
import AIReportWizard from './AIReportWizard'

export default async function NewAIReportPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')
  if (!canCreateAIReport(session.user.role)) redirect('/app/reports')

  // 担当現場取得
  let sites: { id: string; name: string }[]
  if (session.user.role === 'COMPANY_ADMIN' || session.user.role === 'SUPER_ADMIN') {
    sites = await prisma.site.findMany({
      where: { companyId: session.user.companyId, status: { in: ['PLANNING', 'ACTIVE'] } },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    })
  } else {
    const assignments = await prisma.siteAssignment.findMany({
      where: { userId: session.user.id },
      include: { site: { select: { id: true, name: true, status: true } } },
    })
    sites = assignments
      .filter((a) => a.site.status === 'ACTIVE' || a.site.status === 'PLANNING')
      .map((a) => a.site)
  }

  // プラン確認
  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { plan: true },
  })
  const planEnabled = isPlanAIEnabled(company?.plan ?? 'FREE')

  // AI残回数（文字起こし・生成 で別々にカウント）
  const transcribeUsage = await getRemainingAIUsage(session.user.companyId, 'transcribe')
  const generateUsage = await getRemainingAIUsage(session.user.companyId, 'generate_report')
  // 残回数は小さい方を表示
  const remaining = Math.min(transcribeUsage.remaining, generateUsage.remaining)
  const limit = Math.min(transcribeUsage.limit, generateUsage.limit)

  const reportType = session.user.role === 'SITE_SUPERVISOR' ? 'SITE_JOURNAL' : 'WORK_DIARY'

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <a href="/app/reports" className="text-white/80 hover:text-white">←</a>
          <div className="flex-1">
            <p className="font-bold">AI音声日報作成</p>
            <p className="text-xs text-white/70">
              {reportType === 'WORK_DIARY' ? '作業日報（職長）' : '工事日誌（現場監督）'}
            </p>
          </div>
          {planEnabled && (
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${remaining > 0 ? 'bg-green-600' : 'bg-red-600'}`}>
              残{remaining}/{limit}回
            </span>
          )}
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto p-4">
        {!planEnabled ? (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 text-center space-y-3">
            <p className="text-2xl">🎤</p>
            <p className="font-bold text-orange-800">AI音声日報はスタンダードプラン以上の機能です</p>
            <p className="text-sm text-orange-700">
              音声を話すだけでAIが日報を自動作成します。<br />
              スタンダード: 月100回 / プレミアム: 無制限
            </p>
            <a
              href="/manage/billing"
              className="inline-block bg-orange-500 text-white font-bold px-6 py-3 rounded-xl hover:bg-orange-600 transition-colors"
            >
              プランをアップグレード
            </a>
          </div>
        ) : remaining <= 0 ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
            <p className="font-medium text-yellow-800 mb-1">今月のAI使用上限に達しました</p>
            <p className="text-sm text-yellow-700">プレミアムプランなら無制限でご利用いただけます。</p>
            <a href="/manage/billing" className="inline-block mt-3 text-sm text-orange-600 underline">
              プランを確認する
            </a>
          </div>
        ) : (
          <AIReportWizard
            sites={sites}
            defaultReportType={reportType}
            userId={session.user.id}
          />
        )}
      </main>
    </div>
  )
}
