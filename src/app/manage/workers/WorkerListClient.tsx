'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toggleWorkerStatus, bulkToggleWorkerStatus, updateWorkerRole } from './actions'

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  WORKER:          { label: '作業員',   color: 'bg-gray-100 text-gray-700' },
  FOREMAN:         { label: '職長',     color: 'bg-blue-100 text-blue-700' },
  SITE_SUPERVISOR: { label: '現場監督', color: 'bg-purple-100 text-purple-700' },
  COMPANY_ADMIN:   { label: '管理者',   color: 'bg-orange-100 text-orange-700' },
}

interface Worker {
  id: string
  name: string
  email: string
  phone: string | null
  role: string
  isActive: boolean
}

interface Props {
  workers: Worker[]
}

export function WorkerListClient({ workers }: Props) {
  const [selected, setSelected] = useState<string[]>([])
  const [bulkLoading, setBulkLoading] = useState(false)
  const [roleLoading, setRoleLoading] = useState<string | null>(null)

  const allIds = workers.map((w) => w.id)
  const allChecked = allIds.length > 0 && allIds.every((id) => selected.includes(id))
  const someChecked = selected.length > 0

  function toggleAll() { setSelected(allChecked ? [] : allIds) }
  function toggleOne(id: string) {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function handleBulk(isActive: boolean) {
    if (selected.length === 0) return
    if (!confirm(`選択した${selected.length}名を${isActive ? '有効' : '無効'}にしますか？`)) return
    setBulkLoading(true)
    try { await bulkToggleWorkerStatus(selected, isActive); setSelected([]) }
    finally { setBulkLoading(false) }
  }

  async function handleRoleChange(workerId: string, role: 'WORKER' | 'FOREMAN' | 'SITE_SUPERVISOR') {
    setRoleLoading(workerId)
    try { await updateWorkerRole(workerId, role) }
    finally { setRoleLoading(null) }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between gap-3 flex-wrap">
        <h2 className="font-bold text-gray-700">従業員一覧 ({workers.length}名)</h2>
        <div className="flex items-center gap-2">
          {someChecked && (
            <>
              <span className="text-sm text-gray-500">{selected.length}名選択中</span>
              <button onClick={() => handleBulk(true)} disabled={bulkLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-100 text-green-700 hover:bg-green-200 disabled:opacity-50">
                一括有効化
              </button>
              <button onClick={() => handleBulk(false)} disabled={bulkLoading}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-50">
                一括無効化
              </button>
            </>
          )}
          <a href="/api/manage/workers/export"
            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50">
            CSVダウンロード
          </a>
        </div>
      </div>

      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 w-10">
              <input type="checkbox" checked={allChecked} onChange={toggleAll} className="w-4 h-4 accent-orange-500" />
            </th>
            <th className="text-left px-3 py-3 text-gray-500 font-medium">氏名</th>
            <th className="text-left px-3 py-3 text-gray-500 font-medium">役割</th>
            <th className="text-left px-3 py-3 text-gray-500 font-medium hidden sm:table-cell">メールアドレス</th>
            <th className="text-left px-3 py-3 text-gray-500 font-medium">ステータス</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {workers.map((w) => {
            const roleInfo = ROLE_LABELS[w.role] ?? { label: w.role, color: 'bg-gray-100 text-gray-700' }
            const canChangeRole = w.role !== 'COMPANY_ADMIN' && w.role !== 'SUPER_ADMIN'
            return (
              <tr key={w.id} className={`${!w.isActive ? 'opacity-50' : ''} ${selected.includes(w.id) ? 'bg-orange-50' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" checked={selected.includes(w.id)} onChange={() => toggleOne(w.id)} className="w-4 h-4 accent-orange-500" />
                </td>
                <td className="px-3 py-3 font-medium text-gray-800">{w.name}</td>
                <td className="px-3 py-3">
                  {canChangeRole ? (
                    <select
                      value={w.role}
                      disabled={roleLoading === w.id}
                      onChange={(e) => handleRoleChange(w.id, e.target.value as 'WORKER' | 'FOREMAN' | 'SITE_SUPERVISOR')}
                      className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-orange-400"
                    >
                      <option value="WORKER">作業員</option>
                      <option value="FOREMAN">職長</option>
                      <option value="SITE_SUPERVISOR">現場監督</option>
                    </select>
                  ) : (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${roleInfo.color}`}>{roleInfo.label}</span>
                  )}
                </td>
                <td className="px-3 py-3 text-gray-600 hidden sm:table-cell">{w.email}</td>
                <td className="px-3 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${w.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                    {w.isActive ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-3 py-3 text-right">
                  <div className="flex gap-2 justify-end">
                    <Link href={`/manage/workers/${w.id}/profile`}
                      className="text-xs px-3 py-1 rounded font-medium bg-blue-50 text-blue-700 hover:bg-blue-100">
                      プロフィール
                    </Link>
                    <form action={toggleWorkerStatus.bind(null, w.id, !w.isActive)}>
                      <button type="submit"
                        className={`text-xs px-3 py-1 rounded font-medium ${w.isActive ? 'bg-gray-100 text-gray-600 hover:bg-gray-200' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                        {w.isActive ? '無効' : '有効'}
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            )
          })}
          {workers.length === 0 && (
            <tr><td colSpan={6} className="px-5 py-8 text-center text-gray-400">従業員が登録されていません</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
