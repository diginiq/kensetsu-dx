export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { stripe, STRIPE_PLAN_BY_PRICE } from '@/lib/stripe'
import { prisma } from '@/lib/db'
import type Stripe from 'stripe'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') ?? ''
  const secret = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch {
    return NextResponse.json({ error: 'Webhook signature invalid' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const cs = event.data.object as Stripe.Checkout.Session
    const companyId = cs.metadata?.companyId
    const plan = cs.metadata?.plan as 'STANDARD' | 'PREMIUM' | undefined
    const subscriptionId = typeof cs.subscription === 'string' ? cs.subscription : cs.subscription?.id

    if (companyId && plan) {
      await prisma.company.update({
        where: { id: companyId },
        data: {
          plan,
          status: 'ACTIVE',
          stripeSubscriptionId: subscriptionId ?? null,
          planExpiresAt: null,
        },
      })
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = event.data.object as any
    const sub = typeof invoice.subscription === 'string'
      ? await stripe.subscriptions.retrieve(invoice.subscription as string)
      : invoice.subscription as Stripe.Subscription | null
    if (!sub) return NextResponse.json({ ok: true })

    const companyId = sub.metadata?.companyId
    const priceId = sub.items.data[0]?.price.id
    const plan = priceId ? STRIPE_PLAN_BY_PRICE[priceId] : undefined

    if (companyId && plan) {
      await prisma.company.update({
        where: { id: companyId },
        data: { plan, status: 'ACTIVE' },
      })
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object as Stripe.Subscription
    const companyId = sub.metadata?.companyId
    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: { plan: 'FREE', status: 'ACTIVE', stripeSubscriptionId: null },
      })
    }
  }

  if (event.type === 'invoice.payment_failed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const invoice = event.data.object as any
    const sub = typeof invoice.subscription === 'string'
      ? await stripe.subscriptions.retrieve(invoice.subscription as string)
      : invoice.subscription as Stripe.Subscription | null
    const companyId = sub?.metadata?.companyId
    if (companyId) {
      await prisma.company.update({
        where: { id: companyId },
        data: { status: 'SUSPENDED' },
      })
    }
  }

  return NextResponse.json({ ok: true })
}
