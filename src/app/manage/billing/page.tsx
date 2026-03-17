import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

const PLAN_DETAILS = {
  FREE: {
    name: '無料プラン',
    price: '¥0',
    features: ['現場数: 3件まで', '写真保存: 1GBまで', '従業員: 5名まで'],
    color: 'bg-gray-100 text-gray-700',
  },
  STANDARD: {
    name: 'スタンダードプラン',
    price: '¥5,000/月',
    features: ['現場数: 20件まで', '写真保存: 50GBまで', '従業員: 20名まで'],
    color: 'bg-blue-100 text-blue-700',
  },
  PREMIUM: {
    name: 'プレミアムプラン',
    price: '¥15,000/月',
    features: ['現場数: 無制限', '写真保存: 500GB', '従業員: 無制限'],
    color: 'bg-orange-100 text-orange-800',
  },
}

export default async function ManageBillingPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { plan: true, status: true, planExpiresAt: true, stripeCustomerId: true },
  })

  if (!company) redirect('/login')

  const currentPlan = PLAN_DETAILS[company.plan]
  const STATUS_MAP: Record<string, string> = { ACTIVE: '有効', SUSPENDED: '停止中', TRIAL: 'トライアル' }

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">課金管理</h1>

      {/* 現在のプラン */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-bold text-gray-700 mb-4">現在のプラン</h2>
        <div className="flex items-center gap-3 mb-3">
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${currentPlan.color}`}>
            {currentPlan.name}
          </span>
          <span className="text-2xl font-bold text-gray-800">{currentPlan.price}</span>
        </div>
        <div className="space-y-1 mb-4">
          {currentPlan.features.map((f) => (
            <p key={f} className="text-sm text-gray-600 flex items-center gap-2">
              <span className="text-green-500">✓</span> {f}
            </p>
          ))}
        </div>
        <div className="flex gap-3 text-sm text-gray-500">
          <span>ステータス: {STATUS_MAP[company.status]}</span>
          {company.planExpiresAt && (
            <span>有効期限: {company.planExpiresAt.toLocaleDateString('ja-JP')}</span>
          )}
        </div>
      </div>

      {/* プランアップグレード */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-bold text-gray-700 mb-4">プランのアップグレード</h2>
        <div className="space-y-3">
          {Object.entries(PLAN_DETAILS).map(([key, plan]) => (
            <div
              key={key}
              className={`border rounded-xl p-4 ${key === company.plan ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">{plan.name}</p>
                  <p className="text-sm text-gray-500">{plan.features.join(' ・ ')}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-800">{plan.price}</p>
                  {key === company.plan ? (
                    <span className="text-xs text-orange-600 font-medium">現在のプラン</span>
                  ) : (
                    <button
                      disabled
                      className="mt-1 text-xs px-3 py-1 bg-gray-200 text-gray-500 rounded-lg cursor-not-allowed"
                    >
                      Stripe連携準備中
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          ※ お支払いにはStripe決済を利用します。近日対応予定です。
        </p>
      </div>
    </div>
  )
}
