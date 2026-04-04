import Stripe from 'stripe'

// キーが未設定の場合はダミーキーで初期化（ビルド時エラー回避）
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2025-01-27.acacia',
})

export const PLAN_PRICE_IDS: Record<string, string> = {
  STANDARD: process.env.STRIPE_PRICE_STANDARD ?? '',
  PREMIUM: process.env.STRIPE_PRICE_PREMIUM ?? '',
}

export const STRIPE_PLAN_BY_PRICE: Record<string, 'STANDARD' | 'PREMIUM'> = Object.fromEntries(
  Object.entries(PLAN_PRICE_IDS).map(([plan, priceId]) => [priceId, plan as 'STANDARD' | 'PREMIUM'])
)
