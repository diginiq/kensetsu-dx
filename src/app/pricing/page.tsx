import Link from 'next/link'
import Image from 'next/image'
import { Check, X, Minus } from 'lucide-react'

export const metadata = {
  title: '料金プラン | 建設DX',
  description: '建設DXの料金プランをご確認ください。無料プランから始めて、必要に応じてアップグレードできます。',
}

const PLANS = [
  {
    key: 'FREE',
    name: '無料プラン',
    price: '¥0',
    period: '',
    description: '小規模・お試し利用向け',
    color: 'border-gray-200',
    badge: null,
    cta: '無料で始める',
    ctaHref: '/register',
    ctaStyle: 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50',
  },
  {
    key: 'STANDARD',
    name: 'スタンダード',
    price: '¥5,000',
    period: '/月',
    description: '中小建設業者の日常業務に',
    color: 'border-blue-400',
    badge: '人気',
    cta: '今すぐ始める',
    ctaHref: '/register',
    ctaStyle: 'bg-orange-500 text-white hover:bg-orange-600',
  },
  {
    key: 'PREMIUM',
    name: 'プレミアム',
    price: '¥15,000',
    period: '/月',
    description: '大規模・複数現場の管理に',
    color: 'border-orange-400',
    badge: '最上位',
    cta: '今すぐ始める',
    ctaHref: '/register',
    ctaStyle: 'bg-orange-500 text-white hover:bg-orange-600',
  },
]

type FeatureValue = boolean | string | null

interface Feature {
  category: string
  items: {
    label: string
    FREE: FeatureValue
    STANDARD: FeatureValue
    PREMIUM: FeatureValue
    highlight?: boolean
  }[]
}

const FEATURES: Feature[] = [
  {
    category: '基本機能',
    items: [
      { label: '現場数', FREE: '3件', STANDARD: '20件', PREMIUM: '無制限' },
      { label: '従業員数', FREE: '5名', STANDARD: '20名', PREMIUM: '無制限' },
      { label: '写真保存容量', FREE: '1GB', STANDARD: '50GB', PREMIUM: '500GB' },
      { label: '現場写真管理', FREE: true, STANDARD: true, PREMIUM: true },
      { label: '工事台帳・案件管理', FREE: true, STANDARD: true, PREMIUM: true },
      { label: 'PWA（スマホアプリ）', FREE: true, STANDARD: true, PREMIUM: true },
      { label: 'オフライン対応', FREE: true, STANDARD: true, PREMIUM: true },
    ],
  },
  {
    category: '日報・勤怠',
    items: [
      { label: '日報作成・管理', FREE: true, STANDARD: true, PREMIUM: true },
      { label: '日報承認ワークフロー', FREE: true, STANDARD: true, PREMIUM: true },
      { label: '打刻・勤怠管理', FREE: true, STANDARD: true, PREMIUM: true },
      { label: '36協定アラート', FREE: false, STANDARD: true, PREMIUM: true },
      { label: 'Excel出力', FREE: false, STANDARD: true, PREMIUM: true },
    ],
  },
  {
    category: 'AI機能',
    items: [
      {
        label: 'AI音声日報（Whisper文字起こし）',
        FREE: false,
        STANDARD: '月100回',
        PREMIUM: '無制限',
        highlight: true,
      },
      {
        label: 'AI日報自動生成（Claude）',
        FREE: false,
        STANDARD: '月100回',
        PREMIUM: '無制限',
        highlight: true,
      },
    ],
  },
  {
    category: '安全・資格管理',
    items: [
      { label: 'ヒヤリハット報告', FREE: true, STANDARD: true, PREMIUM: true },
      { label: 'KY活動記録', FREE: true, STANDARD: true, PREMIUM: true },
      { label: '資格期限管理', FREE: false, STANDARD: true, PREMIUM: true },
      { label: '設備点検スケジュール', FREE: false, STANDARD: true, PREMIUM: true },
    ],
  },
  {
    category: '通知・連携',
    items: [
      { label: 'メール通知', FREE: true, STANDARD: true, PREMIUM: true },
      { label: 'プッシュ通知（PWA）', FREE: false, STANDARD: true, PREMIUM: true },
      { label: 'LINE通知', FREE: false, STANDARD: true, PREMIUM: true },
      { label: '週次レポートメール', FREE: false, STANDARD: true, PREMIUM: true },
    ],
  },
]

function FeatureCell({ value }: { value: FeatureValue }) {
  if (value === true) return <Check className="w-5 h-5 text-green-500 mx-auto" />
  if (value === false) return <X className="w-5 h-5 text-gray-300 mx-auto" />
  if (value === null) return <Minus className="w-4 h-4 text-gray-300 mx-auto" />
  return <span className="text-sm font-medium text-gray-700">{value}</span>
}

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="KSDX" width={28} height={28} className="rounded border border-white/30" />
            <span className="font-bold text-lg">建設DX</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/80 hover:text-white">
              ログイン
            </Link>
            <Link
              href="/register"
              className="text-sm font-bold px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 transition-colors"
            >
              無料登録
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* タイトル */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-gray-800 mb-3">料金プラン</h1>
          <p className="text-gray-500 text-base">
            無料プランから始めて、業務に合わせてアップグレード。<br />
            すべてのプランでクレジットカード決済（Stripe）に対応。
          </p>
        </div>

        {/* プランカード */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          {PLANS.map((plan) => (
            <div
              key={plan.key}
              className={`bg-white rounded-2xl border-2 ${plan.color} shadow-sm p-6 flex flex-col relative`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                  {plan.badge}
                </span>
              )}
              <div className="mb-4">
                <p className="font-bold text-gray-800 text-lg">{plan.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{plan.description}</p>
              </div>
              <div className="flex items-end gap-1 mb-5">
                <span className="text-3xl font-bold text-gray-800">{plan.price}</span>
                <span className="text-gray-400 text-sm pb-0.5">{plan.period}</span>
              </div>
              <Link
                href={plan.ctaHref}
                className={`block w-full py-3 rounded-xl font-bold text-center text-sm transition-colors min-h-[44px] flex items-center justify-center mt-auto ${plan.ctaStyle}`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        {/* AI機能ハイライト */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-2xl p-6 mb-10">
          <div className="flex items-start gap-4">
            <span className="text-4xl">🎤</span>
            <div>
              <h2 className="font-bold text-orange-800 text-lg mb-1">AI音声日報機能（スタンダード以上）</h2>
              <p className="text-sm text-orange-700 leading-relaxed">
                現場で声を録音するだけで、AIが自動的に日報を作成します。
                OpenAI Whisperによる日本語音声文字起こし + Claude AIによる正式書式の日報生成。
                職長の作業日報・現場監督の工事日誌、両形式に対応。
              </p>
              <div className="flex gap-4 mt-3">
                <div className="text-center">
                  <p className="text-xl font-bold text-orange-600">月100回</p>
                  <p className="text-xs text-orange-500">スタンダード</p>
                </div>
                <div className="text-center">
                  <p className="text-xl font-bold text-orange-600">無制限</p>
                  <p className="text-xs text-orange-500">プレミアム</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 機能比較テーブル */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-10">
          <div className="p-5 border-b border-gray-100">
            <h2 className="font-bold text-gray-800 text-lg">機能比較</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-3 px-4 text-sm text-gray-500 font-medium w-1/2">機能</th>
                  <th className="text-center py-3 px-3 text-sm font-bold text-gray-700 w-1/6">無料</th>
                  <th className="text-center py-3 px-3 text-sm font-bold text-blue-700 w-1/6 bg-blue-50">スタンダード</th>
                  <th className="text-center py-3 px-3 text-sm font-bold text-orange-700 w-1/6">プレミアム</th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((section) => (
                  <>
                    <tr key={section.category} className="bg-gray-50">
                      <td colSpan={4} className="py-2 px-4 text-xs font-bold text-gray-500 uppercase tracking-wide">
                        {section.category}
                      </td>
                    </tr>
                    {section.items.map((item) => (
                      <tr
                        key={item.label}
                        className={`border-b border-gray-50 ${item.highlight ? 'bg-orange-50/40' : ''}`}
                      >
                        <td className="py-2.5 px-4 text-sm text-gray-700">
                          {item.label}
                          {item.highlight && (
                            <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-medium">AI</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <FeatureCell value={item.FREE} />
                        </td>
                        <td className="py-2.5 px-3 text-center bg-blue-50/30">
                          <FeatureCell value={item.STANDARD} />
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <FeatureCell value={item.PREMIUM} />
                        </td>
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* FAQ */}
        <div className="mb-10">
          <h2 className="font-bold text-gray-800 text-lg mb-5">よくある質問</h2>
          <div className="space-y-4">
            {FAQ.map((item) => (
              <div key={item.q} className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="font-medium text-gray-800 mb-1">Q. {item.q}</p>
                <p className="text-sm text-gray-600 leading-relaxed">A. {item.a}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          <h2 className="font-bold text-gray-800 text-xl mb-2">まずは無料でお試しください</h2>
          <p className="text-gray-500 text-sm mb-5">クレジットカード不要。いつでもアップグレード・解約できます。</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/register"
              className="inline-block bg-orange-500 text-white font-bold px-8 py-3 rounded-xl hover:bg-orange-600 transition-colors"
            >
              無料で新規登録
            </Link>
            <Link
              href="/login"
              className="inline-block border-2 border-gray-300 text-gray-700 font-bold px-8 py-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              ログインして始める
            </Link>
          </div>
        </div>
      </div>

      {/* フッター */}
      <footer className="text-white py-4 px-4 mt-8" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-white/60">© 2025 建設DX. All rights reserved.</p>
          <div className="flex gap-4 flex-wrap justify-center sm:justify-end">
            <Link href="/" className="text-xs text-white/60 hover:text-white">トップ</Link>
            <Link href="/login" className="text-xs text-white/60 hover:text-white">ログイン</Link>
            <Link href="/register" className="text-xs text-white/60 hover:text-white">新規登録</Link>
            <a href="mailto:ksdx@diginiq.com" className="text-xs text-white/60 hover:text-white">お問い合わせ</a>
          </div>
        </div>
      </footer>
    </main>
  )
}

const FAQ = [
  {
    q: '無料プランからアップグレードするにはどうすればいいですか？',
    a: 'ログイン後、管理画面の「課金管理」からいつでもアップグレードできます。Stripeの安全な決済画面でクレジットカード情報を入力するだけです。',
  },
  {
    q: 'AI音声日報の「回数」はどのようにカウントされますか？',
    a: '音声の文字起こし（Whisper）とAI日報生成（Claude）それぞれ1回ずつカウントされます。毎月1日にリセットされます。',
  },
  {
    q: '解約はいつでもできますか？',
    a: 'はい、いつでも解約できます。解約後は無料プランに移行します。日割り計算での返金は行っておりません。',
  },
  {
    q: 'トライアル期間はありますか？',
    a: '新規登録後は自動的にトライアル状態になります。トライアル期間中は主要機能をお試しいただけます。',
  },
  {
    q: 'データの保護はどうなっていますか？',
    a: 'AWS S3に暗号化して保存。テナント分離により他社のデータにはアクセスできません。すべての通信はSSL/TLSで保護されています。',
  },
]
