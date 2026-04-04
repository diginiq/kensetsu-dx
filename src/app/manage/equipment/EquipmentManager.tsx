'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createEquipment, updateEquipment, deleteEquipment } from './actions'

const CYCLE_OPTIONS = [
  { value: '', label: '設定なし' },
  { value: '1', label: '毎月' },
  { value: '3', label: '3ヶ月' },
  { value: '6', label: '6ヶ月' },
  { value: '12', label: '年次（12ヶ月）' },
  { value: '24', label: '2年（24ヶ月）' },
]

interface EquipmentItem {
  id: string
  name: string
  model: string | null
  manufacturer: string | null
  serialNumber: string | null
  inspectionDate: Date | null
  nextInspection: Date | null
  inspectionCycle: number | null
}

interface Props {
  equipment: EquipmentItem[]
}

function formatDate(date: Date | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ja-JP')
}

function formatDateInput(date: Date | null): string {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

function getInspectionStatus(nextInspection: Date | null): 'ok' | 'warning' | 'expired' | 'none' {
  if (!nextInspection) return 'none'
  const now = new Date()
  const next = new Date(nextInspection)
  if (next < now) return 'expired'
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (next <= thirtyDays) return 'warning'
  return 'ok'
}

export function EquipmentManager({ equipment }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('この機械を削除しますか？')) return
    await deleteEquipment(id)
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'

  return (
    <div className="space-y-5">
      {/* 新規登録 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-bold text-gray-700 mb-4">機械登録</h2>
        <form action={createEquipment} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">機械名称 *</label>
            <input name="name" required className={inputClass} placeholder="例: バックホウ" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">型式</label>
            <input name="model" className={inputClass} placeholder="PC200-10" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">メーカー</label>
            <input name="manufacturer" className={inputClass} placeholder="コマツ" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">製造番号</label>
            <input name="serialNumber" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">最終検査日</label>
            <input name="inspectionDate" type="date" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">次回検査日</label>
            <input name="nextInspection" type="date" className={inputClass} />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">点検周期</label>
            <select name="inspectionCycle" className={inputClass}>
              {CYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="sm:col-span-3">
            <button
              type="submit"
              className="px-6 py-2 text-white font-bold rounded-lg text-sm"
              style={{ backgroundColor: '#E85D04' }}
            >
              登録する
            </button>
          </div>
        </form>
      </div>

      {/* 機械一覧 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-700">機械一覧 ({equipment.length}台)</h2>
        </div>
        {equipment.length === 0 ? (
          <div className="px-5 py-8 text-center text-gray-400">機械が登録されていません</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">機械名称</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">型式</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">メーカー</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">製造番号</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">最終検査</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">次回検査</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-medium">周期</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {equipment.map((eq) => {
                  const status = getInspectionStatus(eq.nextInspection)
                  const rowClass = status === 'expired' ? 'bg-red-50' : status === 'warning' ? 'bg-yellow-50' : ''

                  if (editingId === eq.id) {
                    return (
                      <tr key={eq.id} className="bg-blue-50">
                        <td colSpan={8} className="px-4 py-3">
                          <form action={async (formData: FormData) => {
                            await updateEquipment(eq.id, formData)
                            setEditingId(null)
                          }} className="grid grid-cols-3 gap-2">
                            <input name="name" defaultValue={eq.name} required className={inputClass} />
                            <input name="model" defaultValue={eq.model ?? ''} className={inputClass} placeholder="型式" />
                            <input name="manufacturer" defaultValue={eq.manufacturer ?? ''} className={inputClass} placeholder="メーカー" />
                            <input name="serialNumber" defaultValue={eq.serialNumber ?? ''} className={inputClass} placeholder="製造番号" />
                            <input name="inspectionDate" type="date" defaultValue={formatDateInput(eq.inspectionDate)} className={inputClass} />
                            <input name="nextInspection" type="date" defaultValue={formatDateInput(eq.nextInspection)} className={inputClass} />
                            <select name="inspectionCycle" defaultValue={eq.inspectionCycle?.toString() ?? ''} className={inputClass}>
                              {CYCLE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                            </select>
                            <div className="col-span-3 flex gap-2">
                              <button type="submit" className="px-3 py-1 text-white text-xs font-bold rounded" style={{ backgroundColor: '#2E7D32' }}>保存</button>
                              <button type="button" onClick={() => setEditingId(null)} className="px-3 py-1 bg-gray-200 text-gray-600 text-xs rounded">キャンセル</button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )
                  }

                  return (
                    <tr key={eq.id} className={rowClass}>
                      <td className="px-4 py-3 font-medium text-gray-800">{eq.name}</td>
                      <td className="px-4 py-3 text-gray-600">{eq.model ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{eq.manufacturer ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{eq.serialNumber ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(eq.inspectionDate)}</td>
                      <td className="px-4 py-3">
                        <span className={
                          status === 'expired' ? 'text-red-600 font-medium' :
                          status === 'warning' ? 'text-yellow-700 font-medium' :
                          'text-gray-600'
                        }>
                          {formatDate(eq.nextInspection)}
                          {status === 'expired' && ' (期限切れ)'}
                          {status === 'warning' && ' (要注意)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {eq.inspectionCycle
                          ? CYCLE_OPTIONS.find((o) => o.value === eq.inspectionCycle?.toString())?.label ?? `${eq.inspectionCycle}ヶ月`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-1 justify-end">
                          <Link
                            href={`/manage/equipment/${eq.id}`}
                            className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
                          >
                            点検履歴
                          </Link>
                          <button
                            onClick={() => setEditingId(eq.id)}
                            className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100"
                          >
                            編集
                          </button>
                          <button
                            onClick={() => handleDelete(eq.id)}
                            className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100"
                          >
                            削除
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
