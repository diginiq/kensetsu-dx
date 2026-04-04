'use client'

import { useEffect, useState, useCallback } from 'react'
import { Wifi, WifiOff, Upload, CheckCircle, AlertCircle } from 'lucide-react'
import {
  getAllQueued,
  updateQueueStatus,
  removeQueueItem,
  type OfflineAudioItem,
} from '@/lib/offlineQueue'

type SyncState = 'idle' | 'syncing' | 'done' | 'error'

export default function OfflineQueueBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [pending, setPending] = useState<OfflineAudioItem[]>([])
  const [syncState, setSyncState] = useState<SyncState>('idle')
  const [syncProgress, setSyncProgress] = useState(0)
  const [visible, setVisible] = useState(false)

  const loadPending = useCallback(async () => {
    try {
      const all = await getAllQueued()
      const items = all.filter((i) => i.status === 'pending' || i.status === 'error')
      setPending(items)
      setVisible(items.length > 0 || !navigator.onLine)
    } catch {
      // IndexedDB not available
    }
  }, [])

  useEffect(() => {
    setIsOnline(navigator.onLine)
    loadPending()

    const handleOnline = () => { setIsOnline(true); loadPending() }
    const handleOffline = () => { setIsOnline(false); setVisible(true) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [loadPending])

  const processItem = async (item: OfflineAudioItem): Promise<boolean> => {
    await updateQueueStatus(item.id, 'uploading')

    const formData = new FormData()
    formData.append('audio', item.audioBlob, `recording.${item.mimeType.split('/')[1] ?? 'webm'}`)

    // 文字起こし
    const transcribeRes = await fetch('/api/ai/transcribe', { method: 'POST', body: formData })
    if (!transcribeRes.ok) {
      const d = await transcribeRes.json().catch(() => ({}))
      await updateQueueStatus(item.id, 'error', d.error ?? '文字起こし失敗')
      return false
    }
    const { transcription } = await transcribeRes.json()

    // AI生成
    const generateRes = await fetch('/api/ai/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        transcription,
        siteId: item.siteId,
        reportType: item.reportType,
        reportDate: item.reportDate,
      }),
    })
    if (!generateRes.ok) {
      const d = await generateRes.json().catch(() => ({}))
      await updateQueueStatus(item.id, 'error', d.error ?? 'AI生成失敗')
      return false
    }
    const generatedReport = await generateRes.json()

    // 日報保存
    const saveRes = await fetch('/api/reports/ai-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        siteId: item.siteId,
        reportDate: item.reportDate,
        reportType: item.reportType,
        transcription,
        photoIds: [],
        ...generatedReport,
      }),
    })
    if (!saveRes.ok) {
      const d = await saveRes.json().catch(() => ({}))
      await updateQueueStatus(item.id, 'error', d.error ?? '保存失敗')
      return false
    }

    await removeQueueItem(item.id)
    return true
  }

  const handleSync = async () => {
    if (!isOnline || pending.length === 0 || syncState === 'syncing') return
    setSyncState('syncing')
    setSyncProgress(0)

    let successCount = 0
    for (let i = 0; i < pending.length; i++) {
      const ok = await processItem(pending[i])
      if (ok) successCount++
      setSyncProgress(Math.round(((i + 1) / pending.length) * 100))
    }

    await loadPending()
    setSyncState(successCount === pending.length ? 'done' : 'error')
    setTimeout(() => {
      setSyncState('idle')
      if (successCount === pending.length) setVisible(false)
    }, 3000)
  }

  if (!visible) return null

  return (
    <div
      className={`fixed bottom-20 left-0 right-0 z-40 max-w-screen-sm mx-auto px-4 pb-2`}
    >
      <div
        className={`rounded-xl shadow-lg border px-4 py-3 flex items-center gap-3 ${
          !isOnline
            ? 'bg-gray-800 border-gray-700 text-white'
            : syncState === 'done'
            ? 'bg-green-50 border-green-200 text-green-800'
            : syncState === 'error'
            ? 'bg-red-50 border-red-200 text-red-800'
            : 'bg-orange-50 border-orange-200 text-orange-800'
        }`}
      >
        {!isOnline ? (
          <>
            <WifiOff className="w-5 h-5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">オフラインモード</p>
              <p className="text-xs opacity-75">録音した内容はオンライン時にアップロードされます</p>
            </div>
          </>
        ) : syncState === 'done' ? (
          <>
            <CheckCircle className="w-5 h-5 shrink-0 text-green-600" />
            <p className="text-sm font-medium flex-1">日報の同期が完了しました</p>
          </>
        ) : syncState === 'error' ? (
          <>
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">一部の同期に失敗しました</p>
              <p className="text-xs">手動で再試行してください</p>
            </div>
            <button onClick={handleSync} className="text-xs font-medium underline">
              再試行
            </button>
          </>
        ) : syncState === 'syncing' ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-orange-500 border-t-transparent shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium">日報を同期中... {syncProgress}%</p>
              <div className="mt-1 h-1 bg-orange-200 rounded-full">
                <div
                  className="h-1 bg-orange-500 rounded-full transition-all"
                  style={{ width: `${syncProgress}%` }}
                />
              </div>
            </div>
          </>
        ) : (
          <>
            <Wifi className="w-5 h-5 shrink-0 text-orange-600" />
            <div className="flex-1">
              <p className="text-sm font-medium">未同期の録音が{pending.length}件あります</p>
              <p className="text-xs opacity-75">オンラインに接続しました</p>
            </div>
            <button
              onClick={handleSync}
              className="flex items-center gap-1 bg-orange-500 text-white text-xs font-medium px-3 py-2 rounded-lg hover:bg-orange-600 min-h-[36px]"
            >
              <Upload className="w-3 h-3" />
              同期
            </button>
          </>
        )}
      </div>
    </div>
  )
}
