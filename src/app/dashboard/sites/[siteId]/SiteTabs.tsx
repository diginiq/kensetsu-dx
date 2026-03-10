'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

type Tab = '写真' | 'フォルダ' | '設定'

interface PhotoItem {
  id: string
  url: string
  thumbUrl: string
  takenAt: string | null
  boardData: Record<string, string> | null
}

interface SiteTabsProps {
  siteId: string
}

export function SiteTabs({ siteId }: SiteTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('写真')
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [lightboxPhoto, setLightboxPhoto] = useState<PhotoItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const fetchPhotos = useCallback(async () => {
    setLoadingPhotos(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/photos`)
      if (res.ok) {
        const data = await res.json()
        setPhotos(data)
      }
    } finally {
      setLoadingPhotos(false)
    }
  }, [siteId])

  useEffect(() => {
    if (activeTab === '写真') fetchPhotos()
  }, [activeTab, fetchPhotos])

  async function handleDelete() {
    if (!confirm('この現場を削除しますか？\n削除した現場は一覧に表示されなくなります。')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/sites/${siteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.push('/dashboard')
      router.refresh()
    } catch {
      alert('削除に失敗しました。もう一度お試しください。')
      setDeleting(false)
    }
  }

  return (
    <>
      {/* ライトボックス */}
      {lightboxPhoto && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setLightboxPhoto(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 bg-white/20 rounded-full flex items-center justify-center"
            onClick={() => setLightboxPhoto(null)}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="max-w-screen-sm w-full px-4" onClick={(e) => e.stopPropagation()}>
            <div className="relative w-full" style={{ paddingBottom: '75%' }}>
              <Image
                src={lightboxPhoto.url}
                alt="撮影写真"
                fill
                className="object-contain rounded-lg"
                unoptimized
              />
            </div>
            {lightboxPhoto.takenAt && (
              <p className="text-white/60 text-xs text-center mt-2">
                {new Date(lightboxPhoto.takenAt).toLocaleString('ja-JP')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* タブヘッダー */}
      <div className="flex border-b border-gray-200 bg-white px-4">
        {(['写真', 'フォルダ', '設定'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === tab ? { color: '#E85D04', borderColor: '#E85D04' } : {}}
          >
            {tab}
            {tab === '写真' && photos.length > 0 && (
              <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                {photos.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* タブコンテンツ */}
      <div className="px-4 py-4 pb-24">
        {/* ── 写真タブ ── */}
        {activeTab === '写真' && (
          <>
            {loadingPhotos ? (
              <div className="grid grid-cols-3 gap-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="aspect-square bg-gray-200 rounded animate-pulse" />
                ))}
              </div>
            ) : photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-1">
                {photos.map((photo) => (
                  <button
                    key={photo.id}
                    onClick={() => setLightboxPhoto(photo)}
                    className="aspect-square relative rounded overflow-hidden bg-gray-100 active:opacity-80"
                  >
                    <Image
                      src={photo.thumbUrl}
                      alt="現場写真"
                      fill
                      className="object-cover"
                      unoptimized
                      onError={(e) => {
                        // サムネイルがなければ元画像にフォールバック
                        ;(e.currentTarget as HTMLImageElement).src = photo.url
                      }}
                    />
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ backgroundColor: '#FFF0E8' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" style={{ color: '#E85D04' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
                <p className="font-bold text-foreground mb-1">写真がありません</p>
                <p className="text-sm text-gray-500">「撮影を開始する」から写真を追加できます</p>
              </div>
            )}
          </>
        )}

        {/* ── フォルダタブ ── */}
        {activeTab === 'フォルダ' && (
          <div className="text-center py-12">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ backgroundColor: '#FFF0E8' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" style={{ color: '#E85D04' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
              </svg>
            </div>
            <p className="font-bold text-foreground mb-1">フォルダがありません</p>
            <p className="text-sm text-gray-500">工種・工程ごとにフォルダを作成できます</p>
          </div>
        )}

        {/* ── 設定タブ ── */}
        {activeTab === '設定' && (
          <div className="space-y-4">
            <p className="text-sm text-gray-500">現場の設定・管理</p>
            <div className="border border-red-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-red-700 mb-1">現場を削除する</h3>
              <p className="text-xs text-gray-500 mb-3">
                削除した現場はアーカイブされ、一覧に表示されなくなります。
              </p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full min-h-touch border border-red-400 text-red-600 font-medium rounded-lg text-sm hover:bg-red-50 transition-colors disabled:opacity-50"
              >
                {deleting ? '削除中...' : 'この現場を削除する'}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
