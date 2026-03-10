'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type SiteStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED' | 'ARCHIVED'

interface Site {
  id: string
  name: string
  clientName: string | null
  clientType: string | null
  address: string | null
  startDate: string | null
  endDate: string | null
  contractAmount: number | null
  status: SiteStatus
  _count: { photos: number }
}

type FilterStatus = 'ACTIVE' | 'COMPLETED' | 'ALL'

const TABS: { value: FilterStatus; label: string }[] = [
  { value: 'ACTIVE', label: '施工中' },
  { value: 'COMPLETED', label: '竣工済' },
  { value: 'ALL', label: 'すべて' },
]

export function SiteListSection() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<FilterStatus>('ACTIVE')
  const [sites, setSites] = useState<Site[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchSites = useCallback(async (status: FilterStatus) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/sites?status=${status}`, { cache: 'no-store' })
      if (!res.ok) throw new Error('取得に失敗しました')
      const data: Site[] = await res.json()
      setSites(data)
    } catch {
      setError('現場一覧の取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSites(activeTab)
  }, [activeTab, fetchSites])

  function handleTabChange(tab: FilterStatus) {
    setActiveTab(tab)
  }

  return (
    <main className="flex-1 px-4 py-6 max-w-screen-sm mx-auto w-full">
      {/* タブ */}
      <div className="flex border-b border-gray-200 mb-5">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => handleTabChange(tab.value)}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.value
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
            style={activeTab === tab.value ? { color: '#E85D04', borderColor: '#E85D04' } : {}}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 現場一覧 */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-2/3 mb-2" />
              <div className="h-4 bg-gray-100 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button
            onClick={() => fetchSites(activeTab)}
            className="text-sm underline"
            style={{ color: '#E85D04' }}
          >
            再読み込み
          </button>
        </div>
      ) : sites.length > 0 ? (
        <div className="space-y-3">
          {sites.map((site) => (
            <button
              key={site.id}
              onClick={() => router.push(`/dashboard/sites/${site.id}`)}
              className="w-full text-left bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:border-gray-300 hover:shadow transition-all active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-base text-foreground truncate">{site.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    {site.clientName && (
                      <p className="text-sm text-gray-500 truncate">{site.clientName}</p>
                    )}
                    {site.clientType && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {CLIENT_TYPE_LABEL[site.clientType]}
                      </span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-2xl font-bold" style={{ color: '#E85D04' }}>
                    {site._count.photos}
                  </p>
                  <p className="text-xs text-gray-400 -mt-1">枚</p>
                </div>
              </div>

              {(site.startDate || site.endDate) && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-1 text-xs text-gray-500">
                  <CalendarIcon />
                  <span>
                    {site.startDate ? formatDate(site.startDate) : '未定'}
                    {' 〜 '}
                    {site.endDate ? formatDate(site.endDate) : '未定'}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      ) : (
        /* 空状態 */
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
            style={{ backgroundColor: '#FFF0E8' }}
          >
            <HomeIcon />
          </div>
          <p className="font-bold text-foreground mb-1">
            {activeTab === 'ACTIVE' && '施工中の現場がありません'}
            {activeTab === 'COMPLETED' && '竣工済の現場がありません'}
            {activeTab === 'ALL' && '現場が登録されていません'}
          </p>
          <p className="text-sm text-gray-500">
            下のボタンから現場を登録しましょう
          </p>
        </div>
      )}

      {/* 新規現場ボタン */}
      <div className="mt-6">
        <Link
          href="/dashboard/sites/new"
          className="flex items-center justify-center gap-2 w-full min-h-touch text-white font-bold rounded-xl text-base transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#E85D04' }}
        >
          <PlusIcon />
          新規現場を登録
        </Link>
      </div>
    </main>
  )
}

const CLIENT_TYPE_LABEL: Record<string, string> = {
  NATIONAL: '国',
  PREFECTURE: '県',
  MUNICIPAL: '市町村',
  PRIVATE: '民間',
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  })
}

function CalendarIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

function HomeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" style={{ color: '#E85D04' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  )
}

function PlusIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  )
}
