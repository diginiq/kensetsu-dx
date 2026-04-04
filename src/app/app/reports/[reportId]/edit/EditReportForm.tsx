'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { WEATHER_OPTIONS, WorkCategory } from '@/lib/reportUtils'
import { WORK_TYPES } from '@/lib/workTypes'

interface Props {
  reportId: string
  siteName: string
  initialData: {
    reportDate: string
    weather: string
    startTime: string
    endTime: string
    breakMinutes: number
    workCategories: WorkCategory[]
    memo: string
  }
  isRejected: boolean
  rejectReason?: string | null
}

const WORK_CATEGORY_KEYS = Object.keys(WORK_TYPES)

export function EditReportForm({ reportId, siteName, initialData, isRejected, rejectReason }: Props) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [weather, setWeather] = useState(initialData.weather)
  const [startTime, setStartTime] = useState(initialData.startTime)
  const [endTime, setEndTime] = useState(initialData.endTime)
  const [breakMinutes, setBreakMinutes] = useState(initialData.breakMinutes)
  const [workCategories, setWorkCategories] = useState<WorkCategory[]>(initialData.workCategories)
  const [memo, setMemo] = useState(initialData.memo)

  function addWorkCategory() {
    setWorkCategories([...workCategories, { category: '土木工事', detail: '', hours: 1, memo: '' }])
  }

  function removeWorkCategory(i: number) {
    setWorkCategories(workCategories.filter((_, idx) => idx !== i))
  }

  function updateWorkCategory(i: number, field: keyof WorkCategory, value: string | number) {
    const updated = [...workCategories]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    updated[i] = { ...updated[i], [field]: value } as WorkCategory
    setWorkCategories(updated)
  }

  async function handleSubmit(status: 'DRAFT' | 'SUBMITTED') {
    setLoading(true)
    setError('')
    try {
      const dateBase = initialData.reportDate
      const startDateTime = new Date(`${dateBase}T${startTime}:00`)
      const endDateTime = new Date(`${dateBase}T${endTime}:00`)

      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          breakMinutes,
          weather,
          workCategories,
          photos: [],
          memo,
          status,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || '更新に失敗しました')
        return
      }

      router.push(`/app/reports/${reportId}`)
      router.refresh()
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const totalWorkHours = workCategories.reduce((sum, c) => sum + (c.hours || 0), 0)
  const reportDateLabel = new Date(initialData.reportDate).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'short',
  })

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-5">
      {/* 差戻し理由 */}
      {isRejected && rejectReason && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm font-bold text-red-700 mb-1">差戻し理由</p>
          <p className="text-sm text-red-600">{rejectReason}</p>
        </div>
      )}

      {/* ステップインジケーター */}
      <div className="flex items-center mb-6 gap-1">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step === s ? 'text-white' : step > s ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}
              style={step === s ? { backgroundColor: '#E85D04' } : {}}
            >
              {step > s ? '✓' : s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 mx-1 ${step > s ? 'bg-green-500' : 'bg-gray-200'}`} />}
          </div>
        ))}
        <div className="ml-2 text-xs text-gray-500">
          {step === 1 ? '天候' : step === 2 ? '作業内容' : '確認・提出'}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
      )}

      {/* Step 1: 天候 (日付・現場は変更不可) */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-1">
            <p className="text-xs text-gray-500">作業日（変更不可）</p>
            <p className="font-bold text-gray-800">{reportDateLabel}</p>
            <p className="text-xs text-gray-500 mt-1">現場</p>
            <p className="font-medium text-gray-700">{siteName}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">天候</label>
            <div className="grid grid-cols-4 gap-2">
              {WEATHER_OPTIONS.map((w) => (
                <button
                  key={w.value}
                  onClick={() => setWeather(w.value)}
                  className={`py-3 rounded-xl border-2 text-center transition-colors ${
                    weather === w.value ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl">{w.icon}</div>
                  <div className="text-xs text-gray-600 mt-1">{w.value}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setStep(2)}
            className="w-full py-4 text-white font-bold rounded-xl text-base"
            style={{ backgroundColor: '#E85D04' }}
          >
            次へ →
          </button>
        </div>
      )}

      {/* Step 2: 作業内容・時間 */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">出勤時刻</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">退勤時刻</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">休憩時間: {breakMinutes}分</label>
            <input
              type="range"
              min={0}
              max={120}
              step={15}
              value={breakMinutes}
              onChange={(e) => setBreakMinutes(parseInt(e.target.value))}
              className="w-full accent-orange-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0分</span><span>30分</span><span>60分</span><span>90分</span><span>120分</span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-700">作業内容</label>
              <span className="text-xs text-gray-400">合計 {totalWorkHours}時間</span>
            </div>
            {workCategories.map((wc, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-3 space-y-2 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">作業 {i + 1}</span>
                  {workCategories.length > 1 && (
                    <button onClick={() => removeWorkCategory(i)} className="text-xs text-red-500 hover:text-red-700">削除</button>
                  )}
                </div>
                <select
                  value={wc.category}
                  onChange={(e) => updateWorkCategory(i, 'category', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  {WORK_CATEGORY_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <input
                  value={wc.detail}
                  onChange={(e) => updateWorkCategory(i, 'detail', e.target.value)}
                  placeholder="細別・作業詳細"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
                <div>
                  <label className="text-xs text-gray-500">作業時間: {wc.hours}時間</label>
                  <input
                    type="range"
                    min={0.5}
                    max={12}
                    step={0.5}
                    value={wc.hours}
                    onChange={(e) => updateWorkCategory(i, 'hours', parseFloat(e.target.value))}
                    className="w-full accent-orange-500 mt-1"
                  />
                </div>
                <input
                  value={wc.memo ?? ''}
                  onChange={(e) => updateWorkCategory(i, 'memo', e.target.value)}
                  placeholder="メモ（任意）"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            ))}
            <button
              onClick={addWorkCategory}
              className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-orange-400 hover:text-orange-600"
            >
              ＋ 作業を追加
            </button>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl">← 戻る</button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-4 text-white font-bold rounded-xl"
              style={{ backgroundColor: '#E85D04' }}
            >
              確認へ →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: 確認・提出 */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">作業日</span>
              <span className="font-medium">{reportDateLabel}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">現場</span>
              <span className="font-medium">{siteName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">天候</span>
              <span className="font-medium">{weather}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">勤務時間</span>
              <span className="font-medium">{startTime} 〜 {endTime}（休憩{breakMinutes}分）</span>
            </div>
            <hr />
            {workCategories.map((wc, i) => (
              <div key={i} className="text-sm">
                <span className="font-medium">{wc.category}</span>
                {wc.detail && <span className="text-gray-500 ml-1">/ {wc.detail}</span>}
                <span className="float-right text-gray-600">{wc.hours}時間</span>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">備考</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              placeholder="特記事項・引継ぎ事項など"
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 py-4 bg-gray-100 text-gray-600 font-bold rounded-xl">← 戻る</button>
          </div>
          <button
            onClick={() => handleSubmit('SUBMITTED')}
            disabled={loading}
            className="w-full py-4 text-white font-bold rounded-xl text-base disabled:opacity-50"
            style={{ backgroundColor: '#E85D04' }}
          >
            {loading ? '提出中...' : isRejected ? '修正して再提出する' : '日報を提出する'}
          </button>
          <button
            onClick={() => handleSubmit('DRAFT')}
            disabled={loading}
            className="w-full py-3 bg-gray-100 text-gray-600 font-medium rounded-xl text-sm"
          >
            下書き保存
          </button>
        </div>
      )}
    </div>
  )
}
