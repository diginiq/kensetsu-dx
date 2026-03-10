'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useCamera } from '@/hooks/useCamera'
import type { BoardData } from '@/hooks/useCamera'
import { ElectronicBoard } from '@/components/photo/ElectronicBoard'
import { toJapaneseDate } from '@/lib/workTypes'
import { useOfflineSync } from '@/hooks/useOfflineSync'

interface CaptureClientProps {
  siteId: string
  siteName: string
  companyName: string
}

export function CaptureClient({ siteId, siteName, companyName }: CaptureClientProps) {
  const router = useRouter()
  const boardRef = useRef<HTMLDivElement>(null)

  const [showBoard, setShowBoard] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [capturedCount, setCapturedCount] = useState(0)
  const [flashVisible, setFlashVisible] = useState(false)
  const [boardPosition, setBoardPosition] = useState({ x: 12, y: 120 })

  const [boardData, setBoardData] = useState<BoardData>({
    constructionName: siteName,
    workCategory: '土木工事',
    workType: '土工',
    subType: '掘削',
    location: '',
    contractor: companyName,
    date: toJapaneseDate(new Date()),
  })

  const { videoRef, facingMode, isReady, error, gpsCoords, switchCamera, capturePhoto } =
    useCamera()

  const { syncState, saveOfflinePhoto } = useOfflineSync()

  const handleCapture = useCallback(async () => {
    if (!isReady || uploading) return

    const blob = await capturePhoto({
      boardData,
      boardPosition,
      boardRef,
      showBoard,
    })
    if (!blob) return

    // シャッターフラッシュ
    setFlashVisible(true)
    setTimeout(() => setFlashVisible(false), 120)

    setUploading(true)
    try {
      const takenAt = new Date().toISOString()

      if (!syncState.isOnline) {
        // オフライン時はIndexedDBに保存
        await saveOfflinePhoto(
          siteId,
          blob,
          null,
          showBoard ? (boardData as unknown as Record<string, string>) : null,
          gpsCoords?.lat ?? null,
          gpsCoords?.lng ?? null,
          takenAt,
        )
        setCapturedCount((n) => n + 1)
        alert('オフラインで保存しました。オンライン復帰時に自動同期されます。')
      } else {
        // オンライン時は直接アップロード
        const form = new FormData()
        form.append('image', blob, `photo_${Date.now()}.jpg`)
        form.append('boardData', JSON.stringify(showBoard ? boardData : null))
        form.append('takenAt', takenAt)
        if (gpsCoords) {
          form.append('lat', String(gpsCoords.lat))
          form.append('lng', String(gpsCoords.lng))
        }

        const res = await fetch(`/api/sites/${siteId}/photos`, { method: 'POST', body: form })
        if (!res.ok) throw new Error('upload failed')

        setCapturedCount((n) => n + 1)
      }
    } catch {
      alert('写真の保存に失敗しました。もう一度お試しください。')
    } finally {
      setUploading(false)
    }
  }, [isReady, uploading, capturePhoto, boardData, boardPosition, showBoard, gpsCoords, siteId, syncState.isOnline, saveOfflinePhoto])

  return (
    <div className="fixed inset-0 bg-black flex flex-col overflow-hidden">
      {/* カメラプレビュー */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
      />

      {/* シャッターフラッシュ */}
      {flashVisible && <div className="absolute inset-0 bg-white/80 pointer-events-none z-30" />}

      {/* エラー表示 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center z-40 bg-black/80 p-6">
          <div className="bg-white rounded-2xl p-6 max-w-xs text-center">
            <p className="text-gray-800 text-sm mb-4">{error}</p>
            <Link
              href={`/dashboard/sites/${siteId}`}
              className="block w-full py-3 rounded-xl text-white font-bold text-sm"
              style={{ backgroundColor: '#E85D04' }}
            >
              戻る
            </Link>
          </div>
        </div>
      )}

      {/* 準備中インジケータ */}
      {!isReady && !error && (
        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/60">
          <p className="text-white text-sm">カメラを起動中...</p>
        </div>
      )}

      {/* 電子黒板オーバーレイ */}
      {showBoard && isReady && (
        <ElectronicBoard
          data={boardData}
          onChange={setBoardData}
          position={boardPosition}
          onPositionChange={setBoardPosition}
          boardRef={boardRef}
        />
      )}

      {/* 上部コントロール */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-4 z-20"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.5) 0%, transparent 100%)' }}>
        <Link
          href={`/dashboard/sites/${siteId}`}
          className="w-10 h-10 rounded-full bg-black/40 flex items-center justify-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>

        {/* 黒板ON/OFFトグル */}
        <button
          onClick={() => setShowBoard((v) => !v)}
          className={`px-3 h-9 rounded-full text-sm font-bold flex items-center gap-1.5 transition-colors ${
            showBoard ? 'bg-green-700 text-white' : 'bg-black/40 text-white/70'
          }`}
        >
          <BoardIcon />
          黒板{showBoard ? 'ON' : 'OFF'}
        </button>

        {/* 撮影枚数 */}
        {capturedCount > 0 && (
          <div className="bg-orange-500 text-white text-sm font-bold w-9 h-9 rounded-full flex items-center justify-center">
            {capturedCount}
          </div>
        )}
      </div>

      {/* 下部コントロール */}
      <div
        className="absolute bottom-0 left-0 right-0 flex items-center justify-around px-8 pb-12 pt-6 z-20"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 100%)' }}
      >
        {/* GPS表示 */}
        <div className="w-12 flex flex-col items-center">
          {gpsCoords ? (
            <div className="text-white/60 text-center">
              <GpsIcon className="w-5 h-5 mx-auto text-green-400" />
              <span className="text-xs text-green-400">GPS</span>
            </div>
          ) : (
            <GpsIcon className="w-5 h-5 text-white/30" />
          )}
        </div>

        {/* シャッターボタン */}
        <button
          onClick={handleCapture}
          disabled={!isReady || uploading}
          className="relative flex items-center justify-center transition-transform active:scale-95 disabled:opacity-50"
          style={{ width: 80, height: 80 }}
          aria-label="撮影"
        >
          <div className="absolute inset-0 rounded-full border-4 border-white/80" />
          <div
            className={`w-16 h-16 rounded-full ${uploading ? 'bg-gray-400' : 'bg-white'} transition-colors`}
          />
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-3 border-gray-600 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </button>

        {/* カメラ切替 */}
        <button
          onClick={switchCamera}
          className="w-12 h-12 rounded-full bg-black/40 flex items-center justify-center"
          aria-label="カメラ切替"
        >
          <FlipIcon />
        </button>
      </div>
    </div>
  )
}

function BoardIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M12 17.25h8.25" />
    </svg>
  )
}

function FlipIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  )
}

function GpsIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className={className ?? 'w-5 h-5'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}
