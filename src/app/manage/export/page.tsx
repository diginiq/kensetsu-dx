'use client'

import { useState } from 'react'

interface ExportItem {
  label: string
  description: string
  endpoint: string
  color: string
}

const EXPORTS: ExportItem[] = [
  {
    label: '従業員一覧 CSV',
    description: '氏名・メール・役割・ステータスなど',
    endpoint: '/api/manage/workers/export',
    color: '#1565C0',
  },
  {
    label: 'KY活動提出状況 CSV',
    description: '日付・現場・作業員・チェック結果',
    endpoint: '/api/manage/export/ky',
    color: '#2E7D32',
  },
  {
    label: 'ヒヤリハット報告 CSV',
    description: '種別・深刻度・説明・対策・ステータス',
    endpoint: '/api/manage/export/hazard',
    color: '#C62828',
  },
]

export default function ExportPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const buildUrl = (endpoint: string) => {
    const params = new URLSearchParams()
    if (dateFrom) params.set('dateFrom', dateFrom)
    if (dateTo) params.set('dateTo', dateTo)
    const qs = params.toString()
    return qs ? `${endpoint}?${qs}` : endpoint
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-800">データエクスポート</h1>
        <p className="text-sm text-gray-500 mt-0.5">各種データをCSV形式でダウンロードできます</p>
      </div>

      {/* 期間フィルタ */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        <h2 className="text-sm font-bold text-gray-700">期間指定（任意）</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-600 mb-1">開始日</label>
            <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">終了日</label>
            <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
          </div>
        </div>
        <p className="text-xs text-gray-400">※ 従業員一覧は期間指定の対象外です</p>
      </div>

      {/* エクスポートボタン群 */}
      <div className="grid grid-cols-1 gap-3">
        {EXPORTS.map((item) => (
          <a
            key={item.endpoint}
            href={buildUrl(item.endpoint)}
            download
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between hover:border-gray-300 hover:shadow-sm transition-all group"
          >
            <div>
              <p className="font-medium text-gray-800 group-hover:text-gray-900">{item.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
            <span
              className="px-3 py-1.5 text-white text-sm font-medium rounded-lg shrink-0"
              style={{ backgroundColor: item.color }}
            >
              CSV DL
            </span>
          </a>
        ))}
      </div>

      {/* 補足情報 */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-medium text-blue-800">エクスポートについて</p>
        <ul className="mt-2 space-y-1 text-xs text-blue-700">
          <li>• CSVはExcelで直接開けるよう文字コードUTF-8 BOM付きで出力されます</li>
          <li>• ダウンロードしたデータの取り扱いには十分ご注意ください</li>
          <li>• 大量データの場合は処理に時間がかかる場合があります</li>
        </ul>
      </div>
    </div>
  )
}
