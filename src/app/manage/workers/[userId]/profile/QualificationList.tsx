'use client'

import { useState } from 'react'
import { createQualification, deleteQualification } from './actions'

interface Qualification {
  id: string
  name: string
  category: string
  certNumber: string | null
  issuedDate: Date | null
  expiresDate: Date | null
  issuedBy: string | null
}

interface Props {
  userId: string
  qualifications: Qualification[]
}

const CATEGORIES = ['免許', '技能講習', '特別教育', 'その他']

function getExpiryStatus(expiresDate: Date | null): 'ok' | 'warning' | 'expired' | 'none' {
  if (!expiresDate) return 'none'
  const now = new Date()
  const expires = new Date(expiresDate)
  if (expires < now) return 'expired'
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  if (expires <= thirtyDays) return 'warning'
  return 'ok'
}

function formatDate(date: Date | null): string {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('ja-JP')
}

export function QualificationList({ userId, qualifications }: Props) {
  const [showForm, setShowForm] = useState(false)

  const handleCreate = async (formData: FormData) => {
    await createQualification(userId, formData)
    setShowForm(false)
  }

  const handleDelete = async (qualId: string) => {
    if (!confirm('この資格を削除しますか？')) return
    await deleteQualification(qualId, userId)
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold text-gray-700">保有資格 ({qualifications.length}件)</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-3 py-1.5 text-sm font-medium rounded-lg"
          style={{ backgroundColor: '#E85D04', color: 'white' }}
        >
          {showForm ? 'キャンセル' : '+ 資格追加'}
        </button>
      </div>

      {showForm && (
        <form action={handleCreate} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1">資格名 *</label>
              <input name="name" required className={inputClass} placeholder="例: 玉掛け技能講習" />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">分類 *</label>
              <select name="category" required className={inputClass}>
                <option value="">選択してください</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">証明書番号</label>
              <input name="certNumber" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">発行機関</label>
              <input name="issuedBy" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">取得日</label>
              <input name="issuedDate" type="date" className={inputClass} />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">有効期限</label>
              <input name="expiresDate" type="date" className={inputClass} />
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 text-white text-sm font-bold rounded-lg"
              style={{ backgroundColor: '#2E7D32' }}
            >
              登録する
            </button>
          </div>
        </form>
      )}

      {qualifications.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">資格が登録されていません</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">資格名</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">分類</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">証明書番号</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">取得日</th>
                <th className="text-left px-4 py-2 text-gray-500 font-medium">有効期限</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {qualifications.map((q) => {
                const status = getExpiryStatus(q.expiresDate)
                const rowClass = status === 'expired'
                  ? 'bg-red-50'
                  : status === 'warning'
                    ? 'bg-yellow-50'
                    : ''
                return (
                  <tr key={q.id} className={rowClass}>
                    <td className="px-4 py-3 font-medium text-gray-800">{q.name}</td>
                    <td className="px-4 py-3 text-gray-600">{q.category}</td>
                    <td className="px-4 py-3 text-gray-600">{q.certNumber ?? '-'}</td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(q.issuedDate)}</td>
                    <td className="px-4 py-3">
                      <span className={
                        status === 'expired' ? 'text-red-600 font-medium' :
                        status === 'warning' ? 'text-yellow-700 font-medium' :
                        'text-gray-600'
                      }>
                        {formatDate(q.expiresDate)}
                        {status === 'expired' && ' (期限切れ)'}
                        {status === 'warning' && ' (まもなく期限切れ)'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="text-xs px-2 py-1 rounded bg-red-100 text-red-600 hover:bg-red-200"
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
