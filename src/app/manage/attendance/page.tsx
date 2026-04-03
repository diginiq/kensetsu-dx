'use client'

import { useEffect, useState } from 'react'

interface DayData {
  day: number
  present: boolean
  workMinutes: number | null // nullは打刻のみ（時間不明）
}

interface WorkerRow {
  workerId: string
  name: string
  days: DayData[]
  workDays: number
  totalWorkHours: number
}

export default function ManageAttendancePage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [data, setData] = useState<{ matrix: WorkerRow[]; daysInMonth: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    fetch(`/api/attendance?year=${year}&month=${month}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [year, month])

  const dayLabels = data ? Array.from({ length: data.daysInMonth }, (_, i) => {
    const d = new Date(year, month - 1, i + 1)
    const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()]
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    return { day: i + 1, dow, isWeekend }
  }) : []

  function formatMinutes(mins: number | null): string {
    if (mins === null) return '●'        // 打刻のみ（時間不明）
    if (mins === 0) return '●'
    const h = Math.floor(mins / 60)
    const m = mins % 60
    return m === 0 ? `${h}h` : `${h}h${m}m`
  }

  function handlePrint() { window.print() }

  const downloadCSV = () => {
    if (!data) return
    const rows = [
      ['氏名', ...dayLabels.map((d) => `${d.day}日(${d.dow})`), '出勤日数', '総実働時間'],
      ...(data.matrix.map((row) => [
        row.name,
        ...row.days.map((d) => {
          if (!d.present) return ''
          if (d.workMinutes === null) return '○'
          const h = Math.floor(d.workMinutes / 60)
          const m = d.workMinutes % 60
          return m === 0 ? `${h}:00` : `${h}:${String(m).padStart(2, '0')}`
        }),
        String(row.workDays),
        `${row.totalWorkHours}h`,
      ])),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `出面表_${year}年${month}月.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">出面表</h1>
          <p className="text-xs text-gray-400 mt-0.5">提出済・承認済の日報をもとに実働時間を表示。日報なしは打刻（○）で表示。</p>
        </div>
        <div className="flex gap-2">
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {[now.getFullYear() - 1, now.getFullYear()].map((y) => <option key={y} value={y}>{y}年</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}月</option>)}
          </select>
          <button onClick={handlePrint} className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium">
            印刷 / PDF
          </button>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex gap-4 text-xs text-gray-500 print:hidden">
        <span className="flex items-center gap-1"><span className="text-green-600 font-bold text-base leading-none">8h</span> 日報あり（実働時間）</span>
        <span className="flex items-center gap-1"><span className="text-orange-500 font-bold text-base leading-none">●</span> 打刻のみ（時間不明）</span>
        <span className="flex items-center gap-1"><span className="text-gray-300 text-base leading-none">-</span> 未出勤</span>
      </div>

      {/* 印刷用タイトル */}
      <div className="hidden print:block text-center mb-4">
        <h1 className="text-xl font-bold">{year}年{month}月 出面表</h1>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden print:shadow-none print:border-0">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-3 py-2 text-left font-medium text-gray-600 min-w-20 sticky left-0 bg-gray-50 z-10">
                    氏名
                  </th>
                  {dayLabels.map(({ day, dow, isWeekend }) => (
                    <th key={day} className={`border border-gray-200 px-1 py-2 text-center font-medium min-w-9 ${isWeekend ? 'text-red-400 bg-red-50' : 'text-gray-600'}`}>
                      <div>{day}</div>
                      <div className="text-xs opacity-70">{dow}</div>
                    </th>
                  ))}
                  <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 bg-blue-50 min-w-14">
                    出勤日数
                  </th>
                  <th className="border border-gray-200 px-2 py-2 text-center font-medium text-gray-600 bg-indigo-50 min-w-16">
                    総実働
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.matrix.map((row) => (
                  <tr key={row.workerId} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-3 py-2 font-medium text-gray-800 sticky left-0 bg-white z-10">
                      {row.name}
                    </td>
                    {row.days.map(({ day, present, workMinutes }) => {
                      const isWeekend = new Date(year, month - 1, day).getDay() === 0 || new Date(year, month - 1, day).getDay() === 6
                      return (
                        <td key={day} className={`border border-gray-200 px-1 py-2 text-center ${isWeekend ? 'bg-red-50' : ''}`}>
                          {present ? (
                            workMinutes !== null ? (
                              <span className="text-green-700 font-bold tabular-nums">{formatMinutes(workMinutes)}</span>
                            ) : (
                              <span className="text-orange-500 font-bold">●</span>
                            )
                          ) : (
                            <span className="text-gray-200">-</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="border border-gray-200 px-2 py-2 text-center font-bold text-blue-700 bg-blue-50">
                      {row.workDays}日
                    </td>
                    <td className="border border-gray-200 px-2 py-2 text-center font-bold text-indigo-700 bg-indigo-50 tabular-nums">
                      {row.totalWorkHours > 0 ? `${row.totalWorkHours}h` : '-'}
                    </td>
                  </tr>
                ))}
                {(!data?.matrix || data.matrix.length === 0) && (
                  <tr>
                    <td colSpan={dayLabels.length + 3} className="px-4 py-8 text-center text-gray-400">
                      データがありません
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CSV出力 */}
      {data && data.matrix.length > 0 && (
        <div className="print:hidden">
          <button
            onClick={downloadCSV}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            CSVダウンロード
          </button>
        </div>
      )}
    </div>
  )
}
