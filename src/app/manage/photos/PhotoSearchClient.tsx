'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

interface Photo {
  id: string
  url: string
  fileName: string
  memo: string | null
  siteName: string
  folderName: string | null
  takenAt: string
  siteId: string
}

interface Filters {
  siteId: string
  folderId: string
  keyword: string
  dateFrom: string
  dateTo: string
}

interface Props {
  photos: Photo[]
  sites: { id: string; name: string }[]
  folders: { id: string; name: string }[]
  totalCount: number
  page: number
  pageSize: number
  filters: Filters
}

export function PhotoSearchClient({
  photos,
  sites,
  folders,
  totalCount,
  page,
  pageSize,
  filters,
}: Props) {
  const router = useRouter()
  const [siteId, setSiteId] = useState(filters.siteId)
  const [folderId, setFolderId] = useState(filters.folderId)
  const [keyword, setKeyword] = useState(filters.keyword)
  const [dateFrom, setDateFrom] = useState(filters.dateFrom)
  const [dateTo, setDateTo] = useState(filters.dateTo)
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null)

  const totalPages = Math.ceil(totalCount / pageSize)

  const buildQuery = (overrides: Partial<Filters & { page: number }> = {}) => {
    const params = new URLSearchParams()
    const merged = { siteId, folderId, keyword, dateFrom, dateTo, page, ...overrides }
    if (merged.siteId) params.set('siteId', merged.siteId)
    if (merged.folderId) params.set('folderId', merged.folderId)
    if (merged.keyword) params.set('keyword', merged.keyword)
    if (merged.dateFrom) params.set('dateFrom', merged.dateFrom)
    if (merged.dateTo) params.set('dateTo', merged.dateTo)
    if ((merged as { page?: number }).page && (merged as { page?: number }).page! > 1) {
      params.set('page', String((merged as { page?: number }).page))
    }
    return `/manage/photos?${params.toString()}`
  }

  const handleSearch = () => {
    router.push(buildQuery({ page: 1 }))
  }

  const handleReset = () => {
    setSiteId('')
    setFolderId('')
    setKeyword('')
    setDateFrom('')
    setDateTo('')
    router.push('/manage/photos')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-800">写真検索</h1>
        <p className="text-sm text-gray-500 mt-0.5">全現場の写真を検索・閲覧できます</p>
      </div>

      {/* 検索フォーム */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">現場</label>
            <select value={siteId} onChange={(e) => { setSiteId(e.target.value); setFolderId('') }}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
              <option value="">すべての現場</option>
              {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">フォルダ</label>
            <select value={folderId} onChange={(e) => setFolderId(e.target.value)}
              disabled={!siteId || folders.length === 0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400">
              <option value="">すべてのフォルダ</option>
              {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">キーワード（メモ）</label>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="写真のメモを検索..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">撮影日（開始）</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">撮影日（終了）</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleSearch}
            className="px-4 py-2 text-white rounded-lg text-sm font-medium"
            style={{ backgroundColor: '#E85D04' }}>
            検索する
          </button>
          <button onClick={handleReset}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
            リセット
          </button>
        </div>
      </div>

      {/* 件数 */}
      <p className="text-sm text-gray-500">
        {totalCount.toLocaleString()}件の写真
        {totalPages > 1 && ` （${page} / ${totalPages} ページ）`}
      </p>

      {/* グリッド */}
      {photos.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400 text-sm">
          写真が見つかりませんでした
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {photos.map((photo) => (
            <button
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden group hover:ring-2 hover:ring-orange-400 transition-all"
            >
              <Image
                src={photo.url}
                alt={photo.memo ?? photo.fileName}
                fill
                sizes="150px"
                className="object-cover"
                unoptimized
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
            </button>
          ))}
        </div>
      )}

      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2 justify-center">
          {page > 1 && (
            <button onClick={() => router.push(buildQuery({ page: page - 1 }))}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              ← 前
            </button>
          )}
          <span className="text-sm text-gray-600">{page} / {totalPages}</span>
          {page < totalPages && (
            <button onClick={() => router.push(buildQuery({ page: page + 1 }))}
              className="px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50">
              次 →
            </button>
          )}
        </div>
      )}

      {/* 写真モーダル */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setSelectedPhoto(null)}
        >
          <div
            className="relative max-w-2xl w-full mx-4 bg-white rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black">
              <Image
                src={selectedPhoto.url}
                alt={selectedPhoto.memo ?? selectedPhoto.fileName}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-gray-800">{selectedPhoto.siteName}</p>
                  {selectedPhoto.folderName && (
                    <p className="text-xs text-gray-500">{selectedPhoto.folderName}</p>
                  )}
                  {selectedPhoto.memo && (
                    <p className="text-sm text-gray-700 mt-1">{selectedPhoto.memo}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(selectedPhoto.takenAt).toLocaleString('ja-JP', {
                      year: 'numeric', month: 'long', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <a
                  href={selectedPhoto.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg shrink-0"
                >
                  原寸表示
                </a>
              </div>
            </div>
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
