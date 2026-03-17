'use client'

import { useEffect, useState } from 'react'

interface WorkerOvertime {
  userId: string
  name: string
  monthlyWorkHours: number
  monthlyOvertimeHours: number
  yearlyOvertimeHours: number
  monthlyLimitHours: number
  yearlyLimitHours: number
  monthlyUsageRate: number
  yearlyUsageRate: number
  alertLevel: 'normal' | 'warning' | 'danger'
}

export default function ManageOvertimePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<{ workers: WorkerOvertime[]; monthlyLimit: number; yearlyLimit: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/overtime?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year, month])

  const alertColors = {
    normal: 'bg-green-500',
    warning: 'bg-yellow-400',
    danger: 'bg-red-500',
  }
  const alertBg = {
    normal: '',
    warning: 'bg-yellow-50 border border-yellow-200',
    danger: 'bg-red-50 border border-red-200',
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">労働時間ダッシュボード</h1>
        <div className="flex gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
          </select>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-bold mb-1">36協定 上限設定</p>
        <p>月間: {data?.monthlyLimit ?? 45}時間 ／ 年間: {data?.yearlyLimit ?? 360}時間</p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : (
        <div className="space-y-4">
          {data?.workers.map((w) => (
            <div key={w.userId} className={`bg-white rounded-xl border shadow-sm p-5 ${alertBg[w.alertLevel]}`}>
              <div className="flex items-center justify-between mb-4">
                <p className="font-bold text-gray-800">{w.name}</p>
                {w.alertLevel !== 'normal' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${w.alertLevel === 'danger' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {w.alertLevel === 'danger' ? '超過注意' : '注意'}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 text-center">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">今月の総労働時間</p>
                  <p className="text-xl font-bold text-gray-800 mt-1">{w.monthlyWorkHours}h</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500">今月の残業時間</p>
                  <p className={`text-xl font-bold mt-1 ${w.alertLevel === 'danger' ? 'text-red-600' : w.alertLevel === 'warning' ? 'text-yellow-600' : 'text-gray-800'}`}>
                    {w.monthlyOvertimeHours}h
                  </p>
                </div>
              </div>

              {/* 月間残業ゲージ */}
              <div className="mb-3">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>月間残業: {w.monthlyOvertimeHours}h / {w.monthlyLimitHours}h</span>
                  <span>{w.monthlyUsageRate}%</span>
                </div>
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${alertColors[w.alertLevel]}`}
                    style={{ width: `${w.monthlyUsageRate}%` }}
                  />
                </div>
              </div>

              {/* 年間残業ゲージ */}
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>年間残業: {w.yearlyOvertimeHours}h / {w.yearlyLimitHours}h</span>
                  <span>{w.yearlyUsageRate}%</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${w.yearlyUsageRate >= 80 ? 'bg-red-400' : w.yearlyUsageRate >= 60 ? 'bg-yellow-400' : 'bg-blue-400'}`}
                    style={{ width: `${w.yearlyUsageRate}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
          {data?.workers.length === 0 && (
            <div className="bg-white rounded-xl p-8 text-center text-gray-400 border border-gray-200">
              作業員が登録されていません
            </div>
          )}
        </div>
      )}
    </div>
  )
}
