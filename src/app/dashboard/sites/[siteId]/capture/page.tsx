import { getServerSession } from 'next-auth'
import { redirect, notFound } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { CaptureClient } from './CaptureClient'

interface Props {
  params: { siteId: string }
}

export default async function CapturePage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const [site, company] = await Promise.all([
    prisma.site.findFirst({
      where: { id: params.siteId, companyId: session.user.companyId, status: { not: 'ARCHIVED' } },
    }),
    prisma.company.findUnique({
      where: { id: session.user.companyId },
      select: { name: true },
    }),
  ])

  if (!site) notFound()

  return (
    <CaptureClient
      siteId={site.id}
      siteName={site.name}
      companyName={company?.name ?? ''}
    />
  )
}
