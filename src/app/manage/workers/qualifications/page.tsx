'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, AlertCircle, CheckCircle } from 'lucide-react'

interface ExpiringQual {
  id: string
  userId: string
  userName: string
  name: string
  category: string
  certNumber: string | null
  expiresDate: string
  daysUntilExpiry: number
  status: 'expired' | 'danger' | 'warning'
}

export default function QualificationsExpiryPage() {
  const [items, setItems] = useState<ExpiringQual[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(60)

  const fetchData = (d: number) => {
    setLoading(true)
    fetch(`/api/workers/qualifications/expiring?days=${d}`)
      .then((r) => r.json())
      .then((data) => { setItems(data); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchData(days) }, [days])

  const expired = items.filter((i) => i.status === 'expired')
  const danger = items.filter((i) => i.status === 'danger')
  const warning = items.filter((i) => i.status === 'warning')

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('ja-JP')
  }

  function DaysLabel({ item }: { item: ExpiringQual }) {
    if (item.daysUntilExpiry < 0) {
      return <span className="text-red-600 font-bold">{Math.abs(item.daysUntilExpiry)}日超過</span>
    }
    if (item.status === 'danger') {
      return <span className="text-orange-600 font-bold">あと{item.daysUntilExpiry}日</span>
    }
    return <span className="text-yellow-700 font-bold">あと{item.daysUntilExpiry}日</span>
  }

  function Section({
    title,
    icon,
    data,
    headerClass,
    rowClass,
  }: {
    title: string
    icon: React.ReactNode
    data: ExpiringQual[]
    headerClass: string
    rowClass: string
  }) {
    if (data.length === 0) return null
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className={`px-5 py-3 flex items-center gap-2 ${headerClass}`}>
          {icon}
          <span className="font-bold">{title} ({data.length}件)</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-5 py-2 text-gray-500 font-medium">従業員</th>
                <th className="text-left px-5 py-2 text-gray-500 font-medium">資格名</th>
                <th className="text-left px-5 py-2 text-gray-500 font-medium">分類</th>
                <th className="text-left px-5 py-2 text-gray-500 font-medium">有効期限</th>
                <th className="text-left px-5 py-2 text-gray-500 font-medium">残日数</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.map((item) => (
                <tr key={item.id} className={rowClass}>
                  <td className="px-5 py-3 font-medium text-gray-800">{item.userName}</td>
                  <td className="px-5 py-3 text-gray-700">{item.name}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs">{item.category}</td>
                  <td className="px-5 py-3 text-gray-700">{formatDate(item.expiresDate)}</td>
                  <td className="px-5 py-3"><DaysLabel item={item} /></td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      href={`/manage/workers/${item.userId}/profile`}
                      className="text-xs px-3 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-medium"
                    >
                      プロフィール
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">資格期限管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">期限切れ・まもなく期限切れの資格を一覧表示します</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">表示範囲:</span>
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value={30}>30日以内</option>
            <option value={60}>60日以内</option>
            <option value={90}>90日以内</option>
            <option value={180}>180日以内</option>
          </select>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-4">
          <AlertCircle className="w-8 h-8 text-red-500 shrink-0" />
          <div>
            <p className="text-sm text-red-700 font-medium">期限切れ</p>
            <p className="text-3xl font-bold text-red-600">{expired.length}<span className="text-base ml-1">件</span></p>
          </div>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-orange-500 shrink-0" />
          <div>
            <p className="text-sm text-orange-700 font-medium">30日以内に期限切れ</p>
            <p className="text-3xl font-bold text-orange-600">{danger.length}<span className="text-base ml-1">件</span></p>
          </div>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-4">
          <CheckCircle className="w-8 h-8 text-yellow-500 shrink-0" />
          <div>
            <p className="text-sm text-yellow-700 font-medium">{days}日以内に期限切れ</p>
            <p className="text-3xl font-bold text-yellow-600">{warning.length}<span className="text-base ml-1">件</span></p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">読み込み中...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-3" />
          <p className="text-gray-600 font-medium">{days}日以内に期限切れになる資格はありません</p>
        </div>
      ) : (
        <>
          <Section
            title="期限切れ"
            icon={<AlertCircle className="w-5 h-5 text-red-600" />}
            data={expired}
            headerClass="bg-red-50 text-red-700 border-b border-red-100"
            rowClass="bg-red-50/30"
          />
          <Section
            title="30日以内に期限切れ"
            icon={<AlertTriangle className="w-5 h-5 text-orange-600" />}
            data={danger}
            headerClass="bg-orange-50 text-orange-700 border-b border-orange-100"
            rowClass="bg-orange-50/20"
          />
          <Section
            title={`${days}日以内に期限切れ`}
            icon={<AlertTriangle className="w-5 h-5 text-yellow-600" />}
            data={warning}
            headerClass="bg-yellow-50 text-yellow-700 border-b border-yellow-100"
            rowClass=""
          />
        </>
      )}
    </div>
  )
}
