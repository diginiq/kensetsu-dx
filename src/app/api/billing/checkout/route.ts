export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe, PLAN_PRICE_IDS } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({ plan: z.enum(['STANDARD', 'PREMIUM']) })

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) return NextResponse.json({ error: '不正なプラン' }, { status: 400 })

  const priceId = PLAN_PRICE_IDS[result.data.plan]
  if (!priceId) {
    return NextResponse.json({ error: 'Stripe価格IDが未設定です' }, { status: 500 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { id: true, name: true, stripeCustomerId: true },
  })
  if (!company) return NextResponse.json({ error: '会社情報なし' }, { status: 404 })

  // Stripeカスタマー取得or作成
  let customerId = company.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: company.name,
      email: session.user.email ?? undefined,
      metadata: { companyId: company.id },
    })
    customerId = customer.id
    await prisma.company.update({
      where: { id: company.id },
      data: { stripeCustomerId: customerId },
    })
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? ''

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${baseUrl}/manage/billing?success=1`,
    cancel_url: `${baseUrl}/manage/billing?cancel=1`,
    metadata: { companyId: company.id, plan: result.data.plan },
    subscription_data: {
      metadata: { companyId: company.id, plan: result.data.plan },
    },
  })

  return NextResponse.json({ url: checkoutSession.url })
}
