'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

export interface BoardData {
  constructionName: string
  workCategory: string
  workType: string
  subType: string
  location: string
  contractor: string
  date: string
}

export interface CaptureOptions {
  boardData: BoardData | null
  boardPosition: { x: number; y: number }
  boardRef: React.MutableRefObject<HTMLDivElement | null>
  showBoard: boolean
}

export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null)

  const startCamera = useCallback(async (facing: 'user' | 'environment') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setIsReady(false)
    setError(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      })
      streamRef.current = stream
      const video = videoRef.current
      if (video) {
        video.srcObject = stream
        await new Promise<void>((res) => {
          video.onloadedmetadata = () => res()
        })
        await video.play()
        setIsReady(true)
      }
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'NotAllowedError'
          ? 'カメラへのアクセスが拒否されました。ブラウザの設定から許可してください。'
          : 'カメラの起動に失敗しました。'
      setError(msg)
    }
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setIsReady(false)
  }, [])

  const switchCamera = useCallback(async () => {
    const next: 'user' | 'environment' = facingMode === 'environment' ? 'user' : 'environment'
    setFacingMode(next)
    await startCamera(next)
  }, [facingMode, startCamera])

  /** カメラ映像＋黒板を合成してJPEG Blobを返す */
  const capturePhoto = useCallback(
    async (options: CaptureOptions): Promise<Blob | null> => {
      const video = videoRef.current
      if (!video || !isReady) return null

      const vw = video.videoWidth || 1280
      const vh = video.videoHeight || 720

      const canvas = document.createElement('canvas')
      canvas.width = vw
      canvas.height = vh
      const ctx = canvas.getContext('2d')!

      // カメラ映像を描画
      ctx.drawImage(video, 0, 0, vw, vh)

      // 黒板を合成
      if (options.showBoard && options.boardData && options.boardRef.current) {
        drawBoardToCanvas(ctx, options.boardData, options.boardRef.current, video, vw, vh)
      }

      return new Promise<Blob | null>((resolve) =>
        canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92),
      )
    },
    [isReady],
  )

  // GPS取得
  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) return
    const id = navigator.geolocation.watchPosition(
      (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [])

  // マウント時にカメラ起動
  useEffect(() => {
    startCamera(facingMode)
    return () => stopCamera()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { videoRef, facingMode, isReady, error, gpsCoords, switchCamera, capturePhoto, startCamera }
}

/** Canvas上に黒板を描画（撮影合成用） */
function drawBoardToCanvas(
  ctx: CanvasRenderingContext2D,
  data: BoardData,
  boardEl: HTMLDivElement,
  video: HTMLVideoElement,
  canvasW: number,
  canvasH: number,
) {
  const rect = boardEl.getBoundingClientRect()
  const videoRect = video.getBoundingClientRect()

  // ビデオ要素のCSS座標からcanvas座標へスケール変換
  const scaleX = canvasW / videoRect.width
  const scaleY = canvasH / videoRect.height

  const bx = (rect.left - videoRect.left) * scaleX
  const by = (rect.top - videoRect.top) * scaleY
  const bw = rect.width * scaleX
  const bh = rect.height * scaleY

  const rows = [
    { label: '工事名', value: data.constructionName },
    { label: '工種', value: `${data.workCategory}　${data.workType}` },
    { label: '細別', value: data.subType },
    { label: '測点', value: data.location },
    { label: '施工者', value: data.contractor },
    { label: '撮影日', value: data.date },
  ]

  const rowH = bh / rows.length
  const labelW = bw * 0.28
  const fs = Math.max(10, Math.floor(rowH * 0.42))

  ctx.save()

  // 背景
  ctx.fillStyle = 'rgba(45, 80, 22, 0.87)'
  ctx.fillRect(bx, by, bw, bh)

  // 外枠
  ctx.strokeStyle = 'rgba(255,255,255,0.9)'
  ctx.lineWidth = Math.max(1, 2 * scaleX)
  ctx.strokeRect(bx, by, bw, bh)

  rows.forEach((row, i) => {
    const ry = by + i * rowH

    // 行区切り線
    if (i > 0) {
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(bx, ry)
      ctx.lineTo(bx + bw, ry)
      ctx.stroke()
    }
    // ラベル区切り線
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(bx + labelW, ry)
    ctx.lineTo(bx + labelW, ry + rowH)
    ctx.stroke()

    // ラベルテキスト
    ctx.fillStyle = 'rgba(255,255,255,0.75)'
    ctx.font = `${fs * 0.85}px sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(row.label, bx + labelW / 2, ry + rowH / 2)

    // 値テキスト
    ctx.fillStyle = 'white'
    ctx.font = `bold ${fs}px sans-serif`
    ctx.textAlign = 'left'
    ctx.textBaseline = 'middle'
    const maxW = bw - labelW - 8 * scaleX
    ctx.fillText(row.value || '　', bx + labelW + 5 * scaleX, ry + rowH / 2, maxW)
  })

  ctx.restore()
}
