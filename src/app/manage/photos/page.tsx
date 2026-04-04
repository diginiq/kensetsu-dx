import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getPhotoUrl } from '@/lib/storage'
import { PhotoSearchClient } from './PhotoSearchClient'

interface SearchParams {
  siteId?: string
  folderId?: string
  keyword?: string
  dateFrom?: string
  dateTo?: string
  page?: string
}

const PAGE_SIZE = 48

export default async function ManagePhotosPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    redirect('/login')
  }

  const page = Math.max(1, parseInt(searchParams.page ?? '1'))
  const siteId = searchParams.siteId ?? ''
  const folderId = searchParams.folderId ?? ''
  const keyword = searchParams.keyword ?? ''
  const dateFrom = searchParams.dateFrom ?? ''
  const dateTo = searchParams.dateTo ?? ''

  const [sites, folders, photosResult] = await Promise.all([
    prisma.site.findMany({
      where: { companyId: session.user.companyId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    siteId
      ? prisma.photoFolder.findMany({
          where: { siteId },
          select: { id: true, name: true },
          orderBy: { name: 'asc' },
        })
      : Promise.resolve([]),
    prisma.photo.findMany({
      where: {
        site: { companyId: session.user.companyId },
        ...(siteId ? { siteId } : {}),
        ...(folderId ? { folderId } : {}),
        ...(keyword ? { memo: { contains: keyword, mode: 'insensitive' } } : {}),
        ...(dateFrom || dateTo
          ? {
              takenAt: {
                ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
                ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59') } : {}),
              },
            }
          : {}),
      },
      include: {
        site: { select: { name: true } },
        folder: { select: { name: true } },
      },
      orderBy: { takenAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  const totalCount = await prisma.photo.count({
    where: {
      site: { companyId: session.user.companyId },
      ...(siteId ? { siteId } : {}),
      ...(folderId ? { folderId } : {}),
      ...(keyword ? { memo: { contains: keyword, mode: 'insensitive' } } : {}),
      ...(dateFrom || dateTo
        ? {
            takenAt: {
              ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
              ...(dateTo ? { lte: new Date(dateTo + 'T23:59:59') } : {}),
            },
          }
        : {}),
    },
  })

  const photos = photosResult.map((p) => ({
    id: p.id,
    url: getPhotoUrl(p.s3Key),
    fileName: p.fileName,
    memo: p.memo,
    siteName: p.site.name,
    folderName: p.folder?.name ?? null,
    takenAt: p.takenAt?.toISOString() ?? p.createdAt.toISOString(),
    siteId: p.siteId,
  }))

  return (
    <PhotoSearchClient
      photos={photos}
      sites={sites}
      folders={folders}
      totalCount={totalCount}
      page={page}
      pageSize={PAGE_SIZE}
      filters={{ siteId, folderId, keyword, dateFrom, dateTo }}
    />
  )
}
