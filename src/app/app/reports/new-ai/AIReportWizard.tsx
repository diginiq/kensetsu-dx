'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import VoiceRecorder from '@/components/features/reports/VoiceRecorder'
import AIReportPreview from '@/components/features/reports/AIReportPreview'
import type { GeneratedReport, ReportType } from '@/lib/claudeAI'
import { Camera, X, CheckCircle, ChevronRight } from 'lucide-react'

interface Props {
  sites: { id: string; name: string }[]
  defaultReportType: ReportType
  userId: string
}

type Step = 'setup' | 'record' | 'preview' | 'saving'

const today = new Date().toISOString().split('T')[0]

export default function AIReportWizard({ sites, defaultReportType }: Props) {
  const router = useRouter()

  // Step 1
  const [siteId, setSiteId] = useState(sites[0]?.id ?? '')
  const [reportDate, setReportDate] = useState(today)
  const [reportType] = useState<ReportType>(defaultReportType)

  // Step 2
  const [transcription, setTranscription] = useState('')
  const [photoFiles, setPhotoFiles] = useState<File[]>([])
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([])

  // Step 3
  const [generatedReport, setGeneratedReport] = useState<GeneratedReport | null>(null)
  const [editedReport, setEditedReport] = useState<GeneratedReport | null>(null)

  const [step, setStep] = useState<Step>('setup')
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  // 写真追加
  const handlePhotos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (files.length + photoFiles.length > 10) {
      setError('写真は最大10枚まで追加できます')
      return
    }
    setPhotoFiles((prev) => [...prev, ...files])
    const urls = files.map((f) => URL.createObjectURL(f))
    setPhotoPreviewUrls((prev) => [...prev, ...urls])
  }

  const removePhoto = (index: number) => {
    URL.revokeObjectURL(photoPreviewUrls[index])
    setPhotoFiles((prev) => prev.filter((_, i) => i !== index))
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index))
  }

  // AI生成
  const handleGenerate = async () => {
    if (!transcription.trim()) {
      setError('音声メモを録音・入力してください')
      return
    }
    setError(null)
    setGenerating(true)
    try {
      const res = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcription, siteId, reportType, reportDate }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'レポート生成に失敗しました')
        return
      }
      setGeneratedReport(data)
      setEditedReport(data)
      setStep('preview')
    } catch {
      setError('ネットワークエラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }

  // 日報保存
  const handleSave = async () => {
    if (!editedReport) return
    setStep('saving')
    setError(null)

    try {
      // 写真をS3にアップロード（既存のphoto upload APIを使用）
      const photoIds: string[] = []
      for (const file of photoFiles) {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('siteId', siteId)
        const res = await fetch('/api/photos/upload', { method: 'POST', body: fd })
        if (res.ok) {
          const d = await res.json()
          if (d.id) photoIds.push(d.id)
        }
      }

      // 日報保存
      const reportData = {
        siteId,
        reportDate,
        reportType,
        aiGenerated: true,
        weather: editedReport.weather,
        temperature: editedReport.temperature,
        startTime: editedReport.startTime,
        endTime: editedReport.endTime,
        workCategories: editedReport.workCategories,
        memo: editedReport.memo,
        safetyNotes: editedReport.safetyNotes,
        photoIds,
        // Whisper文字起こしを備考に追加
        transcription,
      }

      const res = await fetch('/api/reports/ai-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reportData),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? '保存に失敗しました')
        setStep('preview')
        return
      }
      router.push(`/app/reports/${data.id}`)
    } catch {
      setError('保存中にエラーが発生しました')
      setStep('preview')
    }
  }

  const STEP_LABELS: Record<Step, string> = {
    setup: '1. 基本情報',
    record: '2. 音声録音',
    preview: '3. 確認・修正',
    saving: '3. 確認・修正',
  }

  return (
    <div>
      {/* ステップインジケーター */}
      <div className="flex items-center justify-center gap-1 mb-6">
        {(['setup', 'record', 'preview'] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-1">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                step === s
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : step === 'saving' && s === 'preview'
                  ? 'bg-orange-500 border-orange-500 text-white'
                  : ['setup', 'record', 'preview'].indexOf(step) > i ||
                    (step === 'saving' && i < 2)
                  ? 'bg-green-500 border-green-500 text-white'
                  : 'bg-white border-gray-300 text-gray-400'
              }`}
            >
              {(['setup', 'record', 'preview'].indexOf(step) > i ||
                (step === 'saving' && i < 2)) ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                i + 1
              )}
            </div>
            {i < 2 && <div className="w-8 h-0.5 bg-gray-200" />}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
          {error}
        </div>
      )}

      {/* Step 1: 基本情報 */}
      {step === 'setup' && (
        <div className="space-y-4">
          <h2 className="font-bold text-gray-800">基本情報を入力</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">現場</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">日付</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              max={today}
              className="w-full border border-gray-300 rounded-lg px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <p className="text-sm text-blue-700">
              <span className="font-medium">日報種別:</span>{' '}
              {reportType === 'WORK_DIARY'
                ? '作業日報（元請けへ提出）'
                : '工事日誌（発注者・役所へ提出）'}
            </p>
          </div>

          <button
            onClick={() => {
              if (!siteId) { setError('現場を選択してください'); return }
              setError(null)
              setStep('record')
            }}
            className="w-full bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 transition-colors flex items-center justify-center gap-2"
          >
            次へ：録音
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Step 2: 音声録音 */}
      {step === 'record' && (
        <div className="space-y-4">
          <h2 className="font-bold text-gray-800">作業内容を話してください</h2>
          <p className="text-sm text-gray-500">
            今日の作業内容・人数・進捗・安全事項などを話してください。AIが日報を自動作成します。
          </p>

          <VoiceRecorder
            onTranscribed={(text) => setTranscription((prev) => prev ? prev + '\n' + text : text)}
            onError={(msg) => setError(msg)}
          />

          {/* 文字起こし結果（手動編集も可） */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              音声メモ（文字起こし・手入力も可）
            </label>
            <textarea
              value={transcription}
              onChange={(e) => setTranscription(e.target.value)}
              rows={5}
              placeholder="録音すると自動で入力されます。直接入力も可能です。"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          {/* 写真追加 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              写真（任意・最大10枚）
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {photoPreviewUrls.map((url, i) => (
                <div key={i} className="relative w-20 h-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="" className="w-full h-full object-cover rounded-lg" />
                  <button
                    type="button"
                    onClick={() => removePhoto(i)}
                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {photoFiles.length < 10 && (
                <label className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-orange-400 transition-colors">
                  <Camera className="w-6 h-6 text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">追加</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    capture="environment"
                    onChange={handlePhotos}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('setup')}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              戻る
            </button>
            <button
              onClick={handleGenerate}
              disabled={generating || !transcription.trim()}
              className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  AI生成中...
                </>
              ) : (
                <>
                  AI日報生成
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: プレビュー・修正 */}
      {(step === 'preview' || step === 'saving') && editedReport && (
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <h2 className="font-bold text-gray-800">内容を確認・修正</h2>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-medium">
              AI生成
            </span>
          </div>
          <p className="text-sm text-gray-500">
            AIが生成した内容を確認・修正して保存してください。
          </p>

          <AIReportPreview
            report={editedReport}
            onChange={setEditedReport}
          />

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setStep('record')}
              disabled={step === 'saving'}
              className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              戻る
            </button>
            <button
              onClick={handleSave}
              disabled={step === 'saving'}
              className="flex-1 bg-orange-500 text-white py-3 rounded-xl font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {step === 'saving' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  保存中...
                </>
              ) : (
                '日報を提出'
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
