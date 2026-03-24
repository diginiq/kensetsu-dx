'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { LogIn, LogOut } from 'lucide-react'

interface Site { id: string; name: string }
interface Entry { id: string; type: string; timestamp: string; siteName: string }

interface Props {
  sites: Site[]
  todayEntries: Entry[]
  monthlyWorkMinutes: number
}

export function TimeclockClient({ sites, todayEntries, monthlyWorkMinutes }: Props) {
  const router = useRouter()
  const [selectedSiteId, setSelectedSiteId] = useState(sites[0]?.id ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const clockIn = todayEntries.find((e) => e.type === 'CLOCK_IN')
  const clockOut = todayEntries.find((e) => e.type === 'CLOCK_OUT')
  const isWorking = clockIn && !clockOut

  // リアルタイム経過時間
  const elapsedSeconds = isWorking
    ? Math.floor((now.getTime() - new Date(clockIn.timestamp).getTime()) / 1000)
    : null
  const elapsedH = elapsedSeconds !== null ? Math.floor(elapsedSeconds / 3600) : 0
  const elapsedM = elapsedSeconds !== null ? Math.floor((elapsedSeconds % 3600) / 60) : 0
  const elapsedS = elapsedSeconds !== null ? elapsedSeconds % 60 : 0

  const monthlyWorkH = Math.floor(monthlyWorkMinutes / 60)
  const monthlyWorkM = monthlyWorkMinutes % 60

  async function handleClock(type: 'CLOCK_IN' | 'CLOCK_OUT') {
    setLoading(true)
    setError('')
    try {
      let latitude: number | null = null
      let longitude: number | null = null
      if (navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          )
          latitude = pos.coords.latitude
          longitude = pos.coords.longitude
        } catch {
          // GPS取得失敗は無視
        }
      }

      const res = await fetch('/api/timeclock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ siteId: selectedSiteId, type, latitude, longitude }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'エラーが発生しました')
        return
      }

      router.refresh()
    } catch {
      setError('通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-screen-sm mx-auto px-4 py-5 space-y-5">
      {/* 現在時刻 */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center">
        <p className="text-4xl font-bold text-gray-800 tabular-nums">
          {now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </p>
        <p className="text-sm text-gray-400 mt-1">
          {now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
        </p>
        {isWorking && (
          <div className="mt-3 p-2 bg-green-50 rounded-xl">
            <p className="text-xs text-green-600 font-medium">勤務中</p>
            <p className="text-2xl font-bold text-green-700 tabular-nums mt-1">
              {String(elapsedH).padStart(2, '0')}:{String(elapsedM).padStart(2, '0')}:{String(elapsedS).padStart(2, '0')}
            </p>
          </div>
        )}
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}

      {/* 現場選択 */}
      {sites.length > 1 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">現場を選択</label>
          <select
            value={selectedSiteId}
            onChange={(e) => setSelectedSiteId(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
          >
            {sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
      )}

      {/* 打刻ボタン */}
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => handleClock('CLOCK_IN')}
          disabled={loading || !!clockIn}
          className={`py-8 rounded-2xl font-bold text-lg disabled:opacity-40 transition-transform active:scale-95 border-2 ${
            clockIn
              ? 'bg-gray-100 border-gray-200 text-gray-400'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}
        >
          <LogIn size={28} className="mx-auto mb-2" strokeWidth={1.5} />
          出勤
          {clockIn && (
            <div className="text-xs font-normal mt-1 text-gray-400">
              {new Date(clockIn.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </button>
        <button
          onClick={() => handleClock('CLOCK_OUT')}
          disabled={loading || !clockIn || !!clockOut}
          className={`py-8 rounded-2xl font-bold text-lg disabled:opacity-40 transition-transform active:scale-95 border-2 ${
            clockOut
              ? 'bg-gray-100 border-gray-200 text-gray-400'
              : 'bg-orange-50 border-orange-200 text-orange-700'
          }`}
        >
          <LogOut size={28} className="mx-auto mb-2" strokeWidth={1.5} />
          退勤
          {clockOut && (
            <div className="text-xs font-normal mt-1 text-gray-400">
              {new Date(clockOut.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </button>
      </div>

      {/* 今月のサマリー */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="font-bold text-gray-700 mb-3">今月の勤務時間</h2>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">総勤務時間</p>
          <p className="text-2xl font-bold" style={{ color: '#455A64' }}>
            {monthlyWorkH}時間{monthlyWorkM > 0 ? `${monthlyWorkM}分` : ''}
          </p>
        </div>
      </div>

      {/* 今日の打刻履歴 */}
      {todayEntries.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <h2 className="font-bold text-gray-700 mb-3">本日の打刻記録</h2>
          <div className="space-y-2">
            {todayEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.type === 'CLOCK_IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                  {e.type === 'CLOCK_IN' ? '出勤' : '退勤'}
                </span>
                <span className="text-gray-600">{e.siteName}</span>
                <span className="font-medium tabular-nums">
                  {new Date(e.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
