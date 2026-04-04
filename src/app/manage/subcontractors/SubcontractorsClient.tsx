'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Assignment {
  siteId: string
  siteName: string
  role: string | null
  startDate: string | null
  endDate: string | null
}

interface Subcontractor {
  id: string
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  licenseNumber: string | null
  insuranceExpiry: string | null
  insuranceExpired: boolean
  notes: string | null
  isActive: boolean
  assignments: Assignment[]
}

interface Props {
  subcontractors: Subcontractor[]
  sites: { id: string; name: string }[]
}

const EMPTY_FORM = {
  name: '', contactName: '', phone: '', email: '',
  licenseNumber: '', insuranceExpiry: '', notes: '',
}

export function SubcontractorsClient({ subcontractors, sites }: Props) {
  const router = useRouter()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)
  const [assignSiteId, setAssignSiteId] = useState<Record<string, string>>({})
  const [assignRole, setAssignRole] = useState<Record<string, string>>({})

  const handleCreate = async () => {
    if (!form.name) { setError('会社名は必須です'); return }
    setLoading(true); setError('')
    const res = await fetch('/api/manage/subcontractors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        insuranceExpiry: form.insuranceExpiry || null,
      }),
    })
    setLoading(false)
    if (res.ok) {
      setShowForm(false)
      setForm(EMPTY_FORM)
      router.refresh()
    } else {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? '作成に失敗しました')
    }
  }

  const handleAssign = async (subId: string) => {
    const siteId = assignSiteId[subId]
    if (!siteId) return
    await fetch(`/api/manage/subcontractors/${subId}/assign`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId, role: assignRole[subId] || null }),
    })
    router.refresh()
  }

  const handleUnassign = async (subId: string, siteId: string) => {
    await fetch(`/api/manage/subcontractors/${subId}/assign?siteId=${siteId}`, { method: 'DELETE' })
    router.refresh()
  }

  const handleDeactivate = async (subId: string) => {
    if (!confirm('この協力会社を無効化しますか？')) return
    await fetch(`/api/manage/subcontractors/${subId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    router.refresh()
  }

  const active = subcontractors.filter((s) => s.isActive)
  const inactive = subcontractors.filter((s) => !s.isActive)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">協力会社管理</h1>
          <p className="text-sm text-gray-500 mt-0.5">外注先・協力会社の登録と現場アサイン</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 text-white rounded-lg text-sm font-medium"
          style={{ backgroundColor: '#E85D04' }}>
          + 新規登録
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h3 className="font-bold text-gray-700">協力会社を登録</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              { key: 'name', label: '会社名 *', placeholder: '株式会社○○組' },
              { key: 'contactName', label: '担当者名', placeholder: '山田 太郎' },
              { key: 'phone', label: '電話番号', placeholder: '090-0000-0000' },
              { key: 'email', label: 'メール', placeholder: 'info@example.com' },
              { key: 'licenseNumber', label: '建設業許可番号', placeholder: '国土交通大臣 第○○号' },
              { key: 'insuranceExpiry', label: '保険有効期限', placeholder: '' },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs text-gray-600 mb-1">{label}</label>
                <input
                  type={key === 'insuranceExpiry' ? 'date' : 'text'}
                  value={(form as Record<string, string>)[key]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            ))}
          </div>
          <div>
            <label className="block text-xs text-gray-600 mb-1">備考</label>
            <textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button onClick={handleCreate} disabled={loading}
              className="px-4 py-2 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ backgroundColor: '#E85D04' }}>
              {loading ? '登録中...' : '登録する'}
            </button>
            <button onClick={() => { setShowForm(false); setError('') }}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">キャンセル</button>
          </div>
        </div>
      )}

      {active.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400 text-sm">
          協力会社が登録されていません
        </div>
      )}

      <div className="space-y-3">
        {active.map((sub) => (
          <div key={sub.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === sub.id ? null : sub.id)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                <div className="text-left">
                  <p className="font-medium text-gray-800">{sub.name}</p>
                  <p className="text-xs text-gray-500">
                    {sub.contactName && `${sub.contactName} ・ `}
                    {sub.assignments.length}現場担当
                    {sub.insuranceExpired && (
                      <span className="ml-2 text-red-600 font-medium">保険期限切れ</span>
                    )}
                  </p>
                </div>
              </div>
              <svg className={`w-4 h-4 text-gray-400 shrink-0 transition-transform ${expanded === sub.id ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {expanded === sub.id && (
              <div className="px-4 pb-4 border-t border-gray-100 space-y-4 pt-3">
                {/* 基本情報 */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                  {sub.phone && <p className="text-gray-600">📞 {sub.phone}</p>}
                  {sub.email && <p className="text-gray-600">✉ {sub.email}</p>}
                  {sub.licenseNumber && <p className="text-gray-600 col-span-2">許可番号: {sub.licenseNumber}</p>}
                  {sub.insuranceExpiry && (
                    <p className={`col-span-2 text-sm ${sub.insuranceExpired ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      保険期限: {new Date(sub.insuranceExpiry).toLocaleDateString('ja-JP')}
                      {sub.insuranceExpired && ' ⚠️ 期限切れ'}
                    </p>
                  )}
                  {sub.notes && <p className="text-gray-500 text-xs col-span-2">{sub.notes}</p>}
                </div>

                {/* 担当現場 */}
                <div>
                  <p className="text-xs font-bold text-gray-600 mb-2">担当現場</p>
                  {sub.assignments.length === 0 ? (
                    <p className="text-xs text-gray-400">現場に未アサイン</p>
                  ) : (
                    <div className="space-y-1 mb-2">
                      {sub.assignments.map((a) => (
                        <div key={a.siteId} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                          <span className="text-sm text-gray-700">{a.siteName}{a.role && ` — ${a.role}`}</span>
                          <button onClick={() => handleUnassign(sub.id, a.siteId)}
                            className="text-xs text-red-400 hover:text-red-600">解除</button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2 mt-2">
                    <select
                      value={assignSiteId[sub.id] ?? ''}
                      onChange={(e) => setAssignSiteId((p) => ({ ...p, [sub.id]: e.target.value }))}
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                    >
                      <option value="">現場を選択</option>
                      {sites.filter((s) => !sub.assignments.find((a) => a.siteId === s.id)).map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <input
                      value={assignRole[sub.id] ?? ''}
                      onChange={(e) => setAssignRole((p) => ({ ...p, [sub.id]: e.target.value }))}
                      placeholder="役割（任意）"
                      className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-400"
                    />
                    <button onClick={() => handleAssign(sub.id)}
                      className="px-3 py-1.5 text-white rounded-lg text-sm"
                      style={{ backgroundColor: '#455A64' }}>追加</button>
                  </div>
                </div>

                <button onClick={() => handleDeactivate(sub.id)}
                  className="text-xs text-red-500 hover:text-red-700">
                  無効化する
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {inactive.length > 0 && (
        <div className="space-y-2 opacity-50">
          <p className="text-xs font-bold text-gray-400">無効化された協力会社</p>
          {inactive.map((sub) => (
            <div key={sub.id} className="bg-gray-50 rounded-xl border border-gray-100 px-4 py-3">
              <p className="text-sm text-gray-500">{sub.name}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
