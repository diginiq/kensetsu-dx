export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: { stripeCustomerId: true },
  })
  if (!company?.stripeCustomerId) {
    return NextResponse.json({ error: 'お支払い情報がありません' }, { status: 400 })
  }

  const baseUrl = process.env.NEXTAUTH_URL?.replace(/\/$/, '') ?? ''
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: company.stripeCustomerId,
    return_url: `${baseUrl}/manage/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
