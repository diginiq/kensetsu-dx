'use client'

import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import type { GeneratedReport } from '@/lib/claudeAI'

interface AIReportPreviewProps {
  report: GeneratedReport
  onChange: (report: GeneratedReport) => void
}

const WEATHER_OPTIONS = ['晴れ', '曇り', '雨', '雪', '晴れ時々曇り', '曇り時々雨']

export default function AIReportPreview({ report, onChange }: AIReportPreviewProps) {
  const update = (patch: Partial<GeneratedReport>) => onChange({ ...report, ...patch })

  const updateCategory = (index: number, patch: Partial<GeneratedReport['workCategories'][0]>) => {
    const updated = report.workCategories.map((c, i) => (i === index ? { ...c, ...patch } : c))
    onChange({ ...report, workCategories: updated })
  }

  const addCategory = () => {
    onChange({
      ...report,
      workCategories: [
        ...report.workCategories,
        { category: '', description: '', workerCount: 1 },
      ],
    })
  }

  const removeCategory = (index: number) => {
    onChange({
      ...report,
      workCategories: report.workCategories.filter((_, i) => i !== index),
    })
  }

  return (
    <div className="space-y-5">
      {/* 天気・気温・時間 */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">天気</label>
          <select
            value={report.weather}
            onChange={(e) => update({ weather: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {WEATHER_OPTIONS.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
            {!WEATHER_OPTIONS.includes(report.weather) && (
              <option value={report.weather}>{report.weather}</option>
            )}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">気温（℃）</label>
          <input
            type="number"
            value={report.temperature ?? ''}
            onChange={(e) => update({ temperature: e.target.value ? Number(e.target.value) : null })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            placeholder="例: 22"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">開始時刻</label>
          <input
            type="time"
            value={report.startTime}
            onChange={(e) => update({ startTime: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">終了時刻</label>
          <input
            type="time"
            value={report.endTime}
            onChange={(e) => update({ endTime: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
        </div>
      </div>

      {/* 作業内容 */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-sm font-medium text-gray-700">作業内容</label>
          <button
            type="button"
            onClick={addCategory}
            className="flex items-center gap-1 text-xs text-orange-600 hover:text-orange-700 font-medium"
          >
            <Plus className="w-3 h-3" />
            追加
          </button>
        </div>
        <div className="space-y-3">
          {report.workCategories.map((cat, i) => (
            <div key={i} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={cat.category}
                      onChange={(e) => updateCategory(i, { category: e.target.value })}
                      placeholder="工種（例: 型枠工）"
                      className="flex-1 border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={cat.workerCount}
                        onChange={(e) => updateCategory(i, { workerCount: Number(e.target.value) })}
                        min={1}
                        className="w-16 border border-gray-300 rounded-md px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      <span className="text-xs text-gray-500 whitespace-nowrap">名</span>
                    </div>
                  </div>
                  <textarea
                    value={cat.description}
                    onChange={(e) => updateCategory(i, { description: e.target.value })}
                    placeholder="作業内容の詳細"
                    rows={2}
                    className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeCategory(i)}
                  className="text-gray-400 hover:text-red-500 mt-1 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 備考 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">備考・特記事項</label>
        <textarea
          value={report.memo}
          onChange={(e) => update({ memo: e.target.value })}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          placeholder="作業の進捗状況・翌日の予定など"
        />
      </div>

      {/* 安全事項 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">安全管理事項</label>
        <textarea
          value={report.safetyNotes}
          onChange={(e) => update({ safetyNotes: e.target.value })}
          rows={3}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
          placeholder="KY活動・安全確認事項など"
        />
      </div>
    </div>
  )
}
