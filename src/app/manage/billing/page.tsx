import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { BillingClient } from './BillingClient'

export default async function ManageBillingPage({
  searchParams,
}: {
  searchParams: { success?: string; cancel?: string }
}) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { plan: true, status: true, planExpiresAt: true, stripeCustomerId: true },
  })

  if (!company) redirect('/login')

  const stripeConfigured = !!(
    process.env.STRIPE_SECRET_KEY &&
    process.env.STRIPE_PRICE_STANDARD &&
    process.env.STRIPE_PRICE_PREMIUM
  )

  return (
    <BillingClient
      currentPlan={company.plan as 'FREE' | 'STANDARD' | 'PREMIUM'}
      status={company.status}
      planExpiresAt={company.planExpiresAt?.toISOString() ?? null}
      hasStripeCustomer={!!company.stripeCustomerId}
      stripeConfigured={stripeConfigured}
      successParam={searchParams.success === '1'}
      cancelParam={searchParams.cancel === '1'}
    />
  )
}
