'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { z } from 'zod'
import { siteSchema, siteUpdateSchema, CLIENT_TYPE_OPTIONS } from '@/lib/validations/site'

// 日付をHTML date input の値 (YYYY-MM-DD) に変換
function toDateInput(value: string | Date | null | undefined): string {
  if (!value) return ''
  const d = typeof value === 'string' ? new Date(value) : value
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

// 請負金額を3桁カンマ区切りで表示
function formatAmount(value: string): string {
  const num = value.replace(/[^0-9]/g, '')
  if (!num) return ''
  return Number(num).toLocaleString('ja-JP')
}

type SiteStatus = 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'SUSPENDED'

interface DefaultValues {
  name?: string
  clientName?: string | null
  clientType?: string | null
  address?: string | null
  startDate?: string | Date | null
  endDate?: string | Date | null
  contractAmount?: number | null
  status?: SiteStatus
}

interface SiteFormProps {
  mode: 'create' | 'edit'
  siteId?: string
  defaultValues?: DefaultValues
}

const STATUS_OPTIONS: { value: SiteStatus; label: string }[] = [
  { value: 'PLANNING', label: '計画中' },
  { value: 'ACTIVE', label: '施工中' },
  { value: 'COMPLETED', label: '竣工済' },
  { value: 'SUSPENDED', label: '中断' },
]

export function SiteForm({ mode, siteId, defaultValues }: SiteFormProps) {
  const router = useRouter()

  const [name, setName] = useState(defaultValues?.name ?? '')
  const [clientName, setClientName] = useState(defaultValues?.clientName ?? '')
  const [clientType, setClientType] = useState(defaultValues?.clientType ?? '')
  const [address, setAddress] = useState(defaultValues?.address ?? '')
  const [startDate, setStartDate] = useState(toDateInput(defaultValues?.startDate))
  const [endDate, setEndDate] = useState(toDateInput(defaultValues?.endDate))
  const [contractAmountRaw, setContractAmountRaw] = useState(
    defaultValues?.contractAmount?.toLocaleString('ja-JP') ?? '',
  )
  const [status, setStatus] = useState<SiteStatus>(defaultValues?.status ?? 'ACTIVE')

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [globalError, setGlobalError] = useState('')
  const [loading, setLoading] = useState(false)

  function handleAmountInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/[^0-9]/g, '')
    setContractAmountRaw(raw ? Number(raw).toLocaleString('ja-JP') : '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})
    setGlobalError('')

    const amountNum = contractAmountRaw
      ? parseInt(contractAmountRaw.replace(/,/g, ''), 10)
      : null

    const payload = {
      name,
      clientName: clientName || null,
      clientType: clientType || null,
      address: address || null,
      startDate: startDate || null,
      endDate: endDate || null,
      contractAmount: amountNum,
      ...(mode === 'edit' ? { status } : {}),
    }

    // クライアントサイドバリデーション
    const schema = mode === 'create' ? siteSchema : siteUpdateSchema
    const validated = (schema as typeof siteUpdateSchema).safeParse(payload)
    if (!validated.success) {
      const fieldErrors: Record<string, string> = {}
      for (const [key, msgs] of Object.entries(validated.error.flatten().fieldErrors)) {
        fieldErrors[key] = (msgs as string[])[0]
      }
      setErrors(fieldErrors)
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const url = mode === 'create' ? '/api/sites' : `/api/sites/${siteId}`
      const method = mode === 'create' ? 'POST' : 'PUT'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        if (data.details?.fieldErrors) {
          const fieldErrors: Record<string, string> = {}
          for (const [key, msgs] of Object.entries(data.details.fieldErrors)) {
            fieldErrors[key] = (msgs as string[])[0]
          }
          setErrors(fieldErrors)
        } else {
          setGlobalError(data.error ?? 'エラーが発生しました')
        }
        return
      }

      router.push(mode === 'create' ? '/dashboard' : `/dashboard/sites/${siteId}`)
      router.refresh()
    } catch {
      setGlobalError('通信エラーが発生しました。もう一度お試しください。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {globalError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {globalError}
        </div>
      )}

      {/* 現場名 */}
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
          現場名 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="〇〇地区道路改良工事"
          className="w-full min-h-touch px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
      </div>

      {/* 発注者名 ＋ 発注者区分（横並び） */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1">
            発注者名
          </label>
          <input
            id="clientName"
            type="text"
            value={clientName ?? ''}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="〇〇市役所"
            className="w-full min-h-touch px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
          {errors.clientName && <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>}
        </div>

        <div className="w-28">
          <label htmlFor="clientType" className="block text-sm font-medium text-gray-700 mb-1">
            区分
          </label>
          <select
            id="clientType"
            value={clientType ?? ''}
            onChange={(e) => setClientType(e.target.value)}
            className="w-full min-h-touch px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
          >
            <option value="">-</option>
            {CLIENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* 現場住所 */}
      <div>
        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
          現場住所
        </label>
        <input
          id="address"
          type="text"
          value={address ?? ''}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="〇〇県〇〇市〇〇町1-2-3"
          className="w-full min-h-touch px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
        />
        {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
      </div>

      {/* 着工日 ＋ 竣工予定日 */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
            着工日
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full min-h-touch px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
            竣工予定日
          </label>
          <input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full min-h-touch px-3 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>

      {/* 請負金額 */}
      <div>
        <label htmlFor="contractAmount" className="block text-sm font-medium text-gray-700 mb-1">
          請負金額（円）
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-base">
            ¥
          </span>
          <input
            id="contractAmount"
            type="text"
            inputMode="numeric"
            value={contractAmountRaw}
            onChange={handleAmountInput}
            placeholder="10,000,000"
            className="w-full min-h-touch pl-8 pr-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
        {errors.contractAmount && (
          <p className="mt-1 text-sm text-red-600">{errors.contractAmount}</p>
        )}
      </div>

      {/* ステータス変更（編集時のみ） */}
      {mode === 'edit' && (
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            ステータス
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as SiteStatus)}
            className="w-full min-h-touch px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* ボタン */}
      <div className="flex gap-3 pt-2">
        <Link
          href={mode === 'create' ? '/dashboard' : `/dashboard/sites/${siteId}`}
          className="flex-1 min-h-touch flex items-center justify-center border border-gray-300 rounded-xl text-base font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          キャンセル
        </Link>
        <button
          type="submit"
          disabled={loading}
          className="flex-1 min-h-touch text-white font-bold rounded-xl text-base transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: '#E85D04' }}
        >
          {loading ? '保存中...' : mode === 'create' ? '登録する' : '更新する'}
        </button>
      </div>
    </form>
  )
}
