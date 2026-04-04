'use client'

import { useEffect, useState } from 'react'
import { HardDrive } from 'lucide-react'

interface Usage {
  totalGb: number
  limitGb: number
  usagePercent: number
  photoCount: number
}

export function StorageUsageSection() {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/storage/usage')
      .then((r) => r.json())
      .then((d) => setUsage(d))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-400">
        <HardDrive className="w-4 h-4" />
        <span>使用量を取得中...</span>
      </div>
    )
  }
  if (!usage) return null

  const isWarning = usage.usagePercent >= 80
  const isCritical = usage.usagePercent >= 95
  const barColor = isCritical ? '#dc2626' : isWarning ? '#d97706' : '#2E7D32'

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-gray-600">
          <HardDrive className="w-4 h-4" />
          <span>ストレージ使用量</span>
        </div>
        <span className={`font-medium text-sm ${isCritical ? 'text-red-600' : isWarning ? 'text-yellow-600' : 'text-gray-700'}`}>
          {usage.totalGb.toFixed(2)} GB / {usage.limitGb === Infinity ? '無制限' : `${usage.limitGb} GB`}
        </span>
      </div>
      {usage.limitGb !== Infinity && (
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="h-2 rounded-full transition-all"
            style={{ width: `${usage.usagePercent}%`, backgroundColor: barColor }}
          />
        </div>
      )}
      <p className="text-xs text-gray-400">
        写真 {usage.photoCount.toLocaleString('ja-JP')}枚
        {usage.limitGb !== Infinity && ` ・ ${usage.usagePercent}% 使用中`}
      </p>
      {isCritical && (
        <p className="text-xs text-red-600 font-medium">
          ストレージ容量がほぼ上限です。プランをアップグレードしてください。
        </p>
      )}
      {isWarning && !isCritical && (
        <p className="text-xs text-yellow-600">
          ストレージ使用量が80%を超えています。
        </p>
      )}
    </div>
  )
}
