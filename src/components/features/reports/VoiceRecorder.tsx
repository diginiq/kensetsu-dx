'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Mic, MicOff, Square, Play, Trash2, Upload } from 'lucide-react'

interface VoiceRecorderProps {
  onTranscribed: (text: string) => void
  onError?: (msg: string) => void
  disabled?: boolean
}

type RecordingState = 'idle' | 'recording' | 'recorded' | 'uploading'

export default function VoiceRecorder({ onTranscribed, onError, disabled }: VoiceRecorderProps) {
  const [state, setState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [waveform, setWaveform] = useState<number[]>(Array(20).fill(10))

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const blobRef = useRef<Blob | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const animFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // 波形アニメーション
  const updateWaveform = useCallback(() => {
    if (!analyserRef.current) return
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount)
    analyserRef.current.getByteFrequencyData(dataArray)
    // 20本のバーに圧縮
    const bars: number[] = []
    const step = Math.floor(dataArray.length / 20)
    for (let i = 0; i < 20; i++) {
      const slice = dataArray.slice(i * step, (i + 1) * step)
      const avg = slice.reduce((a, b) => a + b, 0) / slice.length
      bars.push(Math.max(4, (avg / 255) * 48))
    }
    setWaveform(bars)
    animFrameRef.current = requestAnimationFrame(updateWaveform)
  }, [])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // Web Audio API for waveform
      const audioCtx = new AudioContext()
      const source = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)
      analyserRef.current = analyser
      animFrameRef.current = requestAnimationFrame(updateWaveform)

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const recorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = recorder
      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        blobRef.current = blob
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setState('recorded')
      }

      recorder.start(1000)
      setState('recording')
      setDuration(0)

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1)
      }, 1000)
    } catch {
      onError?.('マイクへのアクセスが拒否されました')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    if (timerRef.current) clearInterval(timerRef.current)
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
    setWaveform(Array(20).fill(4))
  }

  const discardRecording = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    blobRef.current = null
    setAudioUrl(null)
    setState('idle')
    setDuration(0)
    setWaveform(Array(20).fill(10))
  }

  const uploadAndTranscribe = async () => {
    if (!blobRef.current) return
    setState('uploading')

    const formData = new FormData()
    formData.append('audio', blobRef.current, 'recording.webm')

    try {
      const res = await fetch('/api/ai/transcribe', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) {
        onError?.(data.error ?? '文字起こしに失敗しました')
        setState('recorded')
        return
      }
      onTranscribed(data.transcription)
      discardRecording()
    } catch {
      onError?.('ネットワークエラーが発生しました')
      setState('recorded')
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0')
    const s = (sec % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return (
    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
      {/* 波形表示 */}
      <div className="flex items-end justify-center gap-0.5 h-14 mb-3">
        {waveform.map((h, i) => (
          <div
            key={i}
            className={`w-2 rounded-full transition-all duration-75 ${
              state === 'recording' ? 'bg-red-500' : 'bg-gray-300'
            }`}
            style={{ height: `${h}px` }}
          />
        ))}
      </div>

      {/* 録音時間 */}
      {(state === 'recording' || state === 'recorded') && (
        <p className="text-center text-sm font-mono text-gray-600 mb-3">
          {formatDuration(duration)}
        </p>
      )}

      {/* 再生プレイヤー（録音済みのみ） */}
      {audioUrl && state !== 'uploading' && (
        <audio src={audioUrl} controls className="w-full mb-3 h-8" />
      )}

      {/* コントロールボタン */}
      <div className="flex items-center justify-center gap-3">
        {state === 'idle' && (
          <button
            onClick={startRecording}
            disabled={disabled}
            className="flex items-center gap-2 bg-red-500 text-white px-6 py-3 rounded-full font-medium hover:bg-red-600 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <Mic className="w-5 h-5" />
            録音開始
          </button>
        )}

        {state === 'recording' && (
          <button
            onClick={stopRecording}
            className="flex items-center gap-2 bg-gray-700 text-white px-6 py-3 rounded-full font-medium hover:bg-gray-800 transition-colors min-h-[44px]"
          >
            <Square className="w-5 h-5" />
            録音停止
          </button>
        )}

        {state === 'recorded' && (
          <>
            <button
              onClick={discardRecording}
              className="flex items-center gap-2 bg-white text-gray-600 border border-gray-300 px-4 py-3 rounded-full hover:bg-gray-50 transition-colors min-h-[44px]"
            >
              <Trash2 className="w-4 h-4" />
              削除
            </button>
            <button
              onClick={uploadAndTranscribe}
              className="flex items-center gap-2 bg-orange-500 text-white px-6 py-3 rounded-full font-medium hover:bg-orange-600 transition-colors min-h-[44px]"
            >
              <Upload className="w-5 h-5" />
              文字起こし
            </button>
          </>
        )}

        {state === 'uploading' && (
          <div className="flex items-center gap-2 text-gray-500 py-3">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-400 border-t-transparent" />
            <span className="text-sm">文字起こし中...</span>
          </div>
        )}
      </div>

      {state === 'idle' && (
        <p className="text-center text-xs text-gray-400 mt-2">
          <MicOff className="inline w-3 h-3 mr-1" />
          マイクボタンを押して録音開始
        </p>
      )}
    </div>
  )
}
