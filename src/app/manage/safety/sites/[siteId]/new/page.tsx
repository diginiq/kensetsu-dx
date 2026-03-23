import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { DocumentWizard } from './DocumentWizard'

export default async function NewDocumentPage({ params }: { params: { siteId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const companyId = session.user.companyId

  const [site, workers, equipment, company] = await Promise.all([
    prisma.site.findFirst({
      where: { id: params.siteId, companyId },
      select: { id: true, name: true, clientName: true },
    }),
    prisma.user.findMany({
      where: {
        companyId,
        role: 'WORKER',
        isActive: true,
        siteAssignments: { some: { siteId: params.siteId } },
      },
      select: {
        id: true,
        name: true,
        phone: true,
        workerProfile: true,
        workerQualifications: true,
      },
    }),
    prisma.equipment.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, address: true, phone: true, constructionLicense: true },
    }),
  ])

  if (!site) redirect('/manage/safety')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link
          href={`/manage/safety/sites/${site.id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← {site.name} の書類一覧
        </Link>
      </div>

      <h1 className="text-2xl font-bold text-gray-800">安全書類作成</h1>

      <DocumentWizard
        siteId={site.id}
        siteName={site.name}
        clientName={site.clientName}
        workers={workers}
        equipment={equipment}
        company={company}
      />
    </div>
  )
}
