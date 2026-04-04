import { prisma } from '@/lib/db'
import { getPhotoUrl } from '@/lib/storage'
import { notFound } from 'next/navigation'
import { SharedAlbumViewer } from './SharedAlbumViewer'

export default async function SharedAlbumPage({
  params,
}: {
  params: { token: string }
}) {
  const album = await prisma.sharedAlbum.findFirst({
    where: { token: params.token, isActive: true },
    include: {
      site: { select: { name: true } },
    },
  })

  if (!album) notFound()

  // 期限切れチェック
  if (album.expiresAt && album.expiresAt < new Date()) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <p className="text-2xl font-bold text-gray-400">⏰</p>
          <p className="text-gray-600 mt-2">このアルバムは有効期限が切れています</p>
        </div>
      </div>
    )
  }

  // 写真取得（フォルダ指定があればそのフォルダのみ、なければ現場全体）
  const photos = await prisma.photo.findMany({
    where: {
      siteId: album.siteId,
      ...(album.folderId ? { folderId: album.folderId } : {}),
    },
    include: { folder: { select: { name: true } } },
    orderBy: [{ takenAt: 'asc' }, { createdAt: 'asc' }],
    take: 200,
  })

  return (
    <SharedAlbumViewer
      album={{
        id: album.id,
        title: album.title,
        description: album.description,
        siteName: album.site.name,
        hasPassword: !!album.passwordHash,
        passwordHash: album.passwordHash,
        createdAt: album.createdAt.toISOString(),
      }}
      photos={photos.map((p) => ({
        id: p.id,
        url: getPhotoUrl(p.s3Key),
        fileName: p.fileName,
        memo: p.memo,
        folderName: p.folder?.name ?? null,
        takenAt: (p.takenAt ?? p.createdAt).toISOString(),
      }))}
    />
  )
}
