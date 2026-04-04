'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import { StorageUsageSection } from '@/components/features/settings/StorageUsageSection'

const PLAN_DETAILS = {
  FREE: {
    name: '無料プラン',
    price: '¥0',
    features: ['現場数: 3件まで', '写真保存: 1GBまで', '従業員: 5名まで', 'AI音声日報: 利用不可'],
    color: 'bg-gray-100 text-gray-700',
  },
  STANDARD: {
    name: 'スタンダードプラン',
    price: '¥5,000/月',
    features: ['現場数: 20件まで', '写真保存: 50GBまで', '従業員: 20名まで', 'AI音声日報: 月100回'],
    color: 'bg-blue-100 text-blue-700',
  },
  PREMIUM: {
    name: 'プレミアムプラン',
    price: '¥15,000/月',
    features: ['現場数: 無制限', '写真保存: 500GB', '従業員: 無制限', 'AI音声日報: 無制限'],
    color: 'bg-orange-100 text-orange-800',
  },
}

const STATUS_MAP: Record<string, string> = {
  ACTIVE: '有効',
  SUSPENDED: '停止中',
  TRIAL: 'トライアル',
}
const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  SUSPENDED: 'bg-red-100 text-red-800',
  TRIAL: 'bg-yellow-100 text-yellow-800',
}

interface Props {
  currentPlan: 'FREE' | 'STANDARD' | 'PREMIUM'
  status: string
  planExpiresAt: string | null
  hasStripeCustomer: boolean
  stripeConfigured: boolean
  successParam: boolean
  cancelParam: boolean
}

export function BillingClient({
  currentPlan,
  status,
  planExpiresAt,
  hasStripeCustomer,
  stripeConfigured,
  successParam,
  cancelParam,
}: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState('')

  const planInfo = PLAN_DETAILS[currentPlan]

  async function handleUpgrade(plan: 'STANDARD' | 'PREMIUM') {
    setLoading(plan)
    setError('')
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      if (data.url) window.location.href = data.url
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  async function handlePortal() {
    setLoading('portal')
    setError('')
    try {
      const res = await fetch('/api/billing/portal', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      if (data.url) window.location.href = data.url
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">課金管理</h1>

      {/* 成功・キャンセルバナー */}
      {successParam && (
        <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <p className="text-sm font-medium text-green-800">プランのアップグレードが完了しました。</p>
        </div>
      )}
      {cancelParam && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 shrink-0" />
          <p className="text-sm font-medium text-yellow-800">お支払いはキャンセルされました。</p>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* 現在のプラン */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-700">現在のプラン</h2>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-700'}`}>
            {STATUS_MAP[status] ?? status}
          </span>
        </div>
        <div className="flex items-center gap-3 mb-3">
          <span className={`px-3 py-1 rounded-full text-sm font-bold ${planInfo.color}`}>
            {planInfo.name}
          </span>
          <span className="text-2xl font-bold text-gray-800">{planInfo.price}</span>
        </div>
        <div className="space-y-1 mb-4">
          {planInfo.features.map((f) => (
            <p key={f} className="text-sm text-gray-600 flex items-center gap-2">
              <span className="text-green-500">✓</span> {f}
            </p>
          ))}
        </div>
        {planExpiresAt && (
          <p className="text-xs text-gray-400">有効期限: {new Date(planExpiresAt).toLocaleDateString('ja-JP')}</p>
        )}
        {/* ストレージ使用量 */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <StorageUsageSection />
        </div>
        {/* お支払い管理ポータル */}
        {hasStripeCustomer && currentPlan !== 'FREE' && (
          <button
            onClick={handlePortal}
            disabled={loading === 'portal'}
            className="mt-4 flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50 disabled:opacity-50"
          >
            {loading === 'portal' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ExternalLink className="w-4 h-4" />}
            お支払い情報を管理する
          </button>
        )}
        {status === 'SUSPENDED' && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
            <p className="text-sm text-red-700 font-medium">アカウントが停止中です。お支払い情報を確認してください。</p>
          </div>
        )}
      </div>

      {/* プランアップグレード */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="font-bold text-gray-700 mb-4">プランの変更</h2>
        {!stripeConfigured && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3">
            <p className="text-sm text-yellow-700">Stripe設定が未完了です（環境変数を確認してください）。</p>
          </div>
        )}
        <div className="space-y-3">
          {(Object.entries(PLAN_DETAILS) as [string, typeof PLAN_DETAILS[keyof typeof PLAN_DETAILS]][]).map(([key, plan]) => (
            <div
              key={key}
              className={`border rounded-xl p-4 transition-colors ${key === currentPlan ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{plan.name}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{plan.features.join(' ・ ')}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-gray-800">{plan.price}</p>
                  {key === currentPlan ? (
                    <span className="text-xs text-orange-600 font-medium">現在のプラン</span>
                  ) : key === 'FREE' ? (
                    <span className="text-xs text-gray-400">ダウングレードはポータルから</span>
                  ) : stripeConfigured ? (
                    <button
                      onClick={() => handleUpgrade(key as 'STANDARD' | 'PREMIUM')}
                      disabled={!!loading}
                      className="mt-1 flex items-center gap-1 text-xs px-3 py-1.5 text-white font-bold rounded-lg disabled:opacity-50"
                      style={{ backgroundColor: '#E85D04' }}
                    >
                      {loading === key ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      アップグレード
                    </button>
                  ) : (
                    <span className="text-xs text-gray-400">設定待ち</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          ※ お支払いはStripe決済（クレジットカード）で処理されます。SSL暗号化により安全に処理されます。
        </p>
      </div>
    </div>
  )
}
