'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { FolderTree, type FolderNode } from '@/components/features/photos/FolderTree'
import { PhotoDetailModal } from '@/components/features/photos/PhotoDetailModal'

type Tab = '写真' | 'フォルダ' | '設定'

interface PhotoItem {
  id: string
  url: string
  thumbUrl: string
  s3Key: string
  fileName: string
  boardData: Record<string, string> | null
  memo: string | null
  folderId: string | null
  folder: { id: string; name: string } | null
  latitude: number | null
  longitude: number | null
  takenAt: string | null
  createdAt: string
}

interface PhotoFilter {
  folderId: string | null
  dateFrom: string
  dateTo: string
  q: string
  sort: string
}

interface SiteTabsProps {
  siteId: string
}

export function SiteTabs({ siteId }: SiteTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('写真')
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [loadingPhotos, setLoadingPhotos] = useState(false)
  const [loadingFolders, setLoadingFolders] = useState(false)
  const [photoCount, setPhotoCount] = useState(0)

  // Photo tab state
  const [filter, setFilter] = useState<PhotoFilter>({ folderId: null, dateFrom: '', dateTo: '', q: '', sort: 'takenAt_desc' })
  const [filterOpen, setFilterOpen] = useState(false)
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [detailPhoto, setDetailPhoto] = useState<PhotoItem | null>(null)
  const [showBulkMove, setShowBulkMove] = useState(false)

  // Folder tab state
  const [folderViewId, setFolderViewId] = useState<string | null>(null)
  const [folderPhotos, setFolderPhotos] = useState<PhotoItem[]>([])
  const [loadingFolderPhotos, setLoadingFolderPhotos] = useState(false)
  const [folderDetailPhoto, setFolderDetailPhoto] = useState<PhotoItem | null>(null)

  const [deleting, setDeleting] = useState(false)
  const router = useRouter()

  const fetchFolders = useCallback(async () => {
    setLoadingFolders(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/folders`)
      if (res.ok) setFolders(await res.json())
    } finally { setLoadingFolders(false) }
  }, [siteId])

  const fetchPhotos = useCallback(async () => {
    setLoadingPhotos(true)
    try {
      const params = new URLSearchParams()
      if (filter.folderId) params.set('folderId', filter.folderId)
      if (filter.dateFrom) params.set('dateFrom', filter.dateFrom)
      if (filter.dateTo) params.set('dateTo', filter.dateTo)
      if (filter.q) params.set('q', filter.q)
      params.set('sort', filter.sort)
      const res = await fetch(`/api/sites/${siteId}/photos?${params}`)
      if (res.ok) {
        const data = await res.json()
        setPhotos(data)
        if (!filter.folderId && !filter.dateFrom && !filter.dateTo && !filter.q) setPhotoCount(data.length)
      }
    } finally { setLoadingPhotos(false) }
  }, [siteId, filter])

  const fetchFolderPhotos = useCallback(async (fId: string | null) => {
    setLoadingFolderPhotos(true)
    try {
      const params = new URLSearchParams()
      if (fId) params.set('folderId', fId)
      const res = await fetch(`/api/sites/${siteId}/photos?${params}`)
      if (res.ok) setFolderPhotos(await res.json())
    } finally { setLoadingFolderPhotos(false) }
  }, [siteId])

  useEffect(() => { fetchFolders() }, [fetchFolders])
  useEffect(() => { if (activeTab === '写真') fetchPhotos() }, [activeTab, fetchPhotos])
  useEffect(() => { if (activeTab === 'フォルダ') fetchFolderPhotos(folderViewId) }, [activeTab, folderViewId, fetchFolderPhotos])

  function handlePhotoTap(photo: PhotoItem) {
    if (selecting) {
      setSelected(prev => { const n = new Set(prev); n.has(photo.id) ? n.delete(photo.id) : n.add(photo.id); return n })
    } else {
      setDetailPhoto(photo)
    }
  }

  async function handleBulkMove(folderId: string | null) {
    await Promise.all([...selected].map(id =>
      fetch(`/api/sites/${siteId}/photos/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      })
    ))
    setSelecting(false); setSelected(new Set()); setShowBulkMove(false)
    fetchPhotos(); fetchFolders()
  }

  async function handleDeleteSite() {
    if (!confirm('この現場を削除しますか？\n削除した現場は一覧に表示されなくなります。')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/sites/${siteId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      router.push('/dashboard'); router.refresh()
    } catch { alert('削除に失敗しました。'); setDeleting(false) }
  }

  const allFolderOptions = flattenFolders(folders)

  return (
    <>
      {/* タブヘッダー */}
      <div className="flex border-b border-gray-200 bg-white px-4">
        {(['写真', 'フォルダ', '設定'] as Tab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-gray-500'}`}
            style={activeTab === tab ? { color: '#E85D04', borderColor: '#E85D04' } : {}}
          >
            {tab}
            {tab === '写真' && photoCount > 0 && (
              <span className="ml-1.5 text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">{photoCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* ─── 写真タブ ─── */}
      {activeTab === '写真' && (
        <div>
          {/* フィルターバー */}
          <div className="bg-white border-b border-gray-100">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm"
            >
              <span className="flex items-center gap-2 font-medium text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" /></svg>
                絞り込み・検索
                {(filter.folderId || filter.dateFrom || filter.dateTo || filter.q) && (
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#E85D04' }} />
                )}
              </span>
              <svg xmlns="http://www.w3.org/2000/svg" className={`w-4 h-4 text-gray-400 transition-transform ${filterOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
            </button>

            {filterOpen && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                {/* フォルダ絞り込み */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">フォルダ</label>
                  <select
                    value={filter.folderId ?? ''}
                    onChange={e => setFilter(f => ({ ...f, folderId: e.target.value || null }))}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
                  >
                    <option value="">すべて</option>
                    <option value="unclassified">未分類</option>
                    {allFolderOptions.map(f => (
                      <option key={f.id} value={f.id}>{f.indent}{f.name}</option>
                    ))}
                  </select>
                </div>

                {/* 日付範囲 */}
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">撮影日（開始）</label>
                    <input type="date" value={filter.dateFrom} onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 block mb-1">撮影日（終了）</label>
                    <input type="date" value={filter.dateTo} onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                </div>

                {/* フリーワード */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">メモ・測点で検索</label>
                  <input
                    type="search"
                    value={filter.q}
                    onChange={e => setFilter(f => ({ ...f, q: e.target.value }))}
                    placeholder="キーワードを入力"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm"
                  />
                </div>

                {/* 並び替え */}
                <div>
                  <label className="text-xs text-gray-500 block mb-1">並び替え</label>
                  <select value={filter.sort} onChange={e => setFilter(f => ({ ...f, sort: e.target.value }))} className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white">
                    <option value="takenAt_desc">撮影日（新しい順）</option>
                    <option value="takenAt_asc">撮影日（古い順）</option>
                    <option value="folder">フォルダ順</option>
                  </select>
                </div>

                {/* リセット */}
                <button
                  onClick={() => setFilter({ folderId: null, dateFrom: '', dateTo: '', q: '', sort: 'takenAt_desc' })}
                  className="w-full py-2 text-sm text-gray-500 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  フィルターをリセット
                </button>
              </div>
            )}
          </div>

          {/* 操作バー */}
          <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-gray-100">
            <span className="text-sm text-gray-500">{photos.length}枚</span>
            <button
              onClick={() => { setSelecting(!selecting); setSelected(new Set()) }}
              className={`text-sm font-medium px-3 py-1.5 rounded-lg ${selecting ? 'bg-orange-100 text-orange-700' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              {selecting ? 'キャンセル' : '選択'}
            </button>
          </div>

          {/* フォトグリッド */}
          <div className="pb-24">
            {loadingPhotos ? (
              <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
                {[...Array(9)].map((_, i) => <div key={i} className="aspect-square bg-gray-200 animate-pulse" />)}
              </div>
            ) : photos.length > 0 ? (
              <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
                {photos.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => handlePhotoTap(photo)}
                    className="relative aspect-square bg-gray-100 overflow-hidden active:opacity-80"
                  >
                    {selecting && (
                      <div className={`absolute inset-0 z-10 flex items-center justify-center transition-colors ${selected.has(photo.id) ? 'bg-orange-500/40' : 'bg-black/10'}`}>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${selected.has(photo.id) ? 'border-white bg-orange-500' : 'border-white bg-white/50'}`}>
                          {selected.has(photo.id) && <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>}
                        </div>
                      </div>
                    )}
                    <Image
                      src={photo.thumbUrl}
                      alt="現場写真"
                      fill
                      className="object-cover"
                      unoptimized
                      onError={e => { (e.currentTarget as HTMLImageElement).src = photo.url }}
                    />
                    {photo.boardData && (
                      <div className="absolute bottom-0 left-0 right-0 h-6 flex items-center px-1.5" style={{ background: 'rgba(45,80,22,0.75)' }}>
                        <span className="text-white text-xs truncate">{photo.boardData.workType ?? ''}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#FFF0E8' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7" style={{ color: '#E85D04' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                  </svg>
                </div>
                <p className="font-bold text-foreground mb-1">写真がありません</p>
                <p className="text-sm text-gray-500">
                  {filter.folderId || filter.dateFrom || filter.q ? '条件に一致する写真がありません' : '「撮影を開始する」から写真を追加できます'}
                </p>
              </div>
            )}
          </div>

          {/* 一括操作バー */}
          {selecting && selected.size > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-30 flex items-center gap-3 safe-bottom">
              <span className="flex-1 text-sm font-medium text-gray-700">{selected.size}件選択中</span>
              <button onClick={() => setShowBulkMove(true)} className="px-4 py-2.5 text-white text-sm font-bold rounded-xl" style={{ backgroundColor: '#E85D04' }}>
                フォルダに移動
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── フォルダタブ ─── */}
      {activeTab === 'フォルダ' && (
        <div className="pb-24">
          <div className="px-4 py-4">
            {loadingFolders ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
              </div>
            ) : (
              <FolderTree
                folders={folders}
                siteId={siteId}
                selectedFolderId={folderViewId}
                onSelect={(id) => { setFolderViewId(id === folderViewId ? null : id) }}
                onRefresh={() => { fetchFolders(); fetchFolderPhotos(folderViewId) }}
              />
            )}
          </div>

          {/* 選択フォルダの写真 */}
          {folderViewId !== undefined && (
            <div className="border-t border-gray-100">
              <div className="px-4 py-3 bg-gray-50 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" style={{ color: '#E85D04' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
                </svg>
                <span className="text-sm font-medium text-gray-700">
                  {folderViewId === null ? 'すべての写真' : folderViewId === 'unclassified' ? '未分類' : folders.flatMap(f => [f, ...f.children]).find(f => f.id === folderViewId)?.name ?? 'フォルダ'}
                </span>
                <span className="text-xs text-gray-400 ml-auto">{folderPhotos.length}枚</span>
              </div>

              {loadingFolderPhotos ? (
                <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
                  {[...Array(6)].map((_, i) => <div key={i} className="aspect-square bg-gray-200 animate-pulse" />)}
                </div>
              ) : folderPhotos.length > 0 ? (
                <div className="grid grid-cols-3 gap-0.5 px-0.5 pt-0.5">
                  {folderPhotos.map(photo => (
                    <button key={photo.id} onClick={() => setFolderDetailPhoto(photo)} className="relative aspect-square bg-gray-100 overflow-hidden active:opacity-80">
                      <Image src={photo.thumbUrl} alt="現場写真" fill className="object-cover" unoptimized onError={e => { (e.currentTarget as HTMLImageElement).src = photo.url }} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-center py-8 text-sm text-gray-400">このフォルダに写真はありません</p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── 設定タブ ─── */}
      {activeTab === '設定' && (
        <div className="px-4 py-4 pb-24 space-y-4">
          <p className="text-sm text-gray-500">現場の設定・管理</p>
          <div className="border border-red-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-red-700 mb-1">現場を削除する</h3>
            <p className="text-xs text-gray-500 mb-3">削除した現場はアーカイブされ、一覧に表示されなくなります。</p>
            <button onClick={handleDeleteSite} disabled={deleting} className="w-full min-h-touch border border-red-400 text-red-600 font-medium rounded-lg text-sm hover:bg-red-50 disabled:opacity-50">
              {deleting ? '削除中...' : 'この現場を削除する'}
            </button>
          </div>
        </div>
      )}

      {/* 写真詳細モーダル（写真タブ用） */}
      {detailPhoto && (
        <PhotoDetailModal
          photo={detailPhoto}
          siteId={siteId}
          folders={folders}
          onClose={() => setDetailPhoto(null)}
          onUpdate={updated => { setDetailPhoto(updated as PhotoItem); fetchPhotos(); fetchFolders() }}
          onDelete={() => { setDetailPhoto(null); fetchPhotos(); fetchFolders() }}
        />
      )}

      {/* 写真詳細モーダル（フォルダタブ用） */}
      {folderDetailPhoto && (
        <PhotoDetailModal
          photo={folderDetailPhoto}
          siteId={siteId}
          folders={folders}
          onClose={() => setFolderDetailPhoto(null)}
          onUpdate={updated => { setFolderDetailPhoto(updated as PhotoItem); fetchFolderPhotos(folderViewId) }}
          onDelete={() => { setFolderDetailPhoto(null); fetchFolderPhotos(folderViewId); fetchFolders() }}
        />
      )}

      {/* 一括フォルダ移動モーダル */}
      {showBulkMove && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-end" onClick={() => setShowBulkMove(false)}>
          <div className="bg-white w-full rounded-t-2xl max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-base">フォルダを選択（{selected.size}件）</h3>
            </div>
            <div className="p-3 space-y-1">
              <button onClick={() => handleBulkMove(null)} className="w-full text-left px-3 py-3 rounded-xl hover:bg-gray-50 text-sm text-gray-500">
                未分類（フォルダなし）
              </button>
              {allFolderOptions.map(f => (
                <button key={f.id} onClick={() => handleBulkMove(f.id)} className="w-full text-left px-3 py-3 rounded-xl hover:bg-orange-50 text-sm font-medium">
                  {f.indent}📁 {f.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// フォルダツリーを flat に展開（select option 用）
function flattenFolders(folders: FolderNode[], depth = 0): { id: string; name: string; indent: string }[] {
  const result: { id: string; name: string; indent: string }[] = []
  for (const f of folders) {
    result.push({ id: f.id, name: f.name, indent: '　'.repeat(depth) })
    result.push(...flattenFolders(f.children, depth + 1))
  }
  return result
}
