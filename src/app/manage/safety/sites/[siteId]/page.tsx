import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { DocumentList } from './DocumentList'

export default async function SiteDocumentsPage({ params }: { params: { siteId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const site = await prisma.site.findFirst({
    where: { id: params.siteId, companyId: session.user.companyId },
    select: { id: true, name: true },
  })
  if (!site) redirect('/manage/safety')

  const documents = await prisma.safetyDocument.findMany({
    where: { siteId: params.siteId, companyId: session.user.companyId },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/manage/safety" className="text-sm text-gray-500 hover:text-gray-700">
          ← 安全書類管理
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{site.name}</h1>
          <p className="text-sm text-gray-500">安全書類一覧</p>
        </div>
        <Link
          href={`/manage/safety/sites/${site.id}/new`}
          className="px-4 py-2 text-white rounded-lg text-sm font-bold"
          style={{ backgroundColor: '#E85D04' }}
        >
          + 書類作成
        </Link>
      </div>

      <DocumentList documents={documents} siteId={site.id} />
    </div>
  )
}
