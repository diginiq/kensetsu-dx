'use client'

import { useState, useEffect } from 'react'
import { useOfflineSync, PendingPhoto } from '@/hooks/useOfflineSync'

export function SyncStatusButton() {
  const { syncState, syncPendingPhotos, getPendingPhotos, deletePendingPhoto } = useOfflineSync()
  const [showPanel, setShowPanel] = useState(false)
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([])
  const [thumbUrls, setThumbUrls] = useState<Record<string, string>>({})

  const loadPending = async () => {
    const photos = await getPendingPhotos()
    setPendingPhotos(photos)
    // Create object URLs for thumbnails
    const urls: Record<string, string> = {}
    for (const p of photos) {
      if (p.thumbBlob) {
        urls[p.id] = URL.createObjectURL(p.thumbBlob)
      } else {
        urls[p.id] = URL.createObjectURL(p.imageBlob)
      }
    }
    setThumbUrls(prev => {
      // Revoke old URLs
      Object.values(prev).forEach(u => URL.revokeObjectURL(u))
      return urls
    })
  }

  useEffect(() => {
    if (showPanel) {
      loadPending()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showPanel, syncState.pendingCount])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      Object.values(thumbUrls).forEach(u => URL.revokeObjectURL(u))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getStatusIcon = () => {
    if (!syncState.isOnline) return { icon: '❌', color: 'text-red-500', label: 'オフライン' }
    if (syncState.isSyncing) return { icon: '🔄', color: 'text-blue-500', label: `同期中 ${syncState.pendingCount}件` }
    if (syncState.pendingCount > 0) return { icon: '⚠️', color: 'text-yellow-500', label: `未同期 ${syncState.pendingCount}件` }
    return { icon: '✅', color: 'text-green-500', label: '同期済み' }
  }

  const status = getStatusIcon()

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className="flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white/10 transition-colors min-h-[44px] min-w-[44px]"
        aria-label={`同期状態: ${status.label}`}
      >
        <span className={`text-lg ${syncState.isSyncing ? 'animate-spin' : ''}`}>{status.icon}</span>
        {syncState.pendingCount > 0 && (
          <span className="text-xs text-white font-bold">{syncState.pendingCount}</span>
        )}
      </button>

      {showPanel && (
        <div className="fixed inset-0 z-50 flex flex-col" onClick={() => setShowPanel(false)}>
          {/* バックドロップ */}
          <div className="flex-1 bg-black/40" />

          {/* パネル */}
          <div
            className="bg-white rounded-t-2xl shadow-xl max-h-[80vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">同期状態</h2>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-500 hover:text-gray-700 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                ✕
              </button>
            </div>

            {/* ステータスサマリー */}
            <div className="p-4 bg-gray-50 border-b">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{status.icon}</span>
                <div>
                  <p className={`font-bold text-base ${status.color}`}>{status.label}</p>
                  {syncState.lastSyncAt && (
                    <p className="text-sm text-gray-500">
                      最終同期: {syncState.lastSyncAt.toLocaleTimeString('ja-JP')}
                    </p>
                  )}
                </div>
                {syncState.isOnline && syncState.pendingCount > 0 && !syncState.isSyncing && (
                  <button
                    onClick={syncPendingPhotos}
                    className="ml-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold min-h-[44px]"
                  >
                    今すぐ同期
                  </button>
                )}
              </div>
            </div>

            {/* 未同期写真一覧 */}
            <div className="flex-1 overflow-y-auto">
              {pendingPhotos.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p className="text-4xl mb-2">✅</p>
                  <p>未同期の写真はありません</p>
                </div>
              ) : (
                <div>
                  <p className="px-4 py-2 text-sm text-gray-500 bg-gray-50">
                    未同期の写真 {pendingPhotos.length}件
                  </p>
                  {pendingPhotos.map(photo => (
                    <div key={photo.id} className="flex items-center gap-3 p-3 border-b">
                      {thumbUrls[photo.id] && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumbUrls[photo.id]}
                          alt="未同期写真"
                          className="w-14 h-14 object-cover rounded-lg flex-shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {photo.boardData?.constructionName ?? '（工事名なし）'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(photo.takenAt).toLocaleString('ja-JP')}
                        </p>
                        {photo.retryCount > 0 && (
                          <p className="text-xs text-yellow-600">
                            再試行: {photo.retryCount}/3回
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => deletePendingPhoto(photo.id).then(loadPending)}
                        className="text-red-500 p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        aria-label="削除"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
