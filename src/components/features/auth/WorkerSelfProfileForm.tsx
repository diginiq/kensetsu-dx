'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, User } from 'lucide-react'

interface Props {
  defaultValues: {
    phone: string | null
    address: string | null
    emergencyName: string | null
    emergencyPhone: string | null
    emergencyRelation: string | null
    bloodType: string | null
    healthInsuranceType: string | null
    healthInsuranceNo: string | null
    pensionType: string | null
    pensionNo: string | null
    employmentInsuranceNo: string | null
    specialMedicalCheck: boolean
    lastMedicalCheckDate: string | null
  }
}

export function WorkerSelfProfileForm({ defaultValues }: Props) {
  const [phone, setPhone] = useState(defaultValues.phone ?? '')
  const [address, setAddress] = useState(defaultValues.address ?? '')
  const [emergencyName, setEmergencyName] = useState(defaultValues.emergencyName ?? '')
  const [emergencyPhone, setEmergencyPhone] = useState(defaultValues.emergencyPhone ?? '')
  const [emergencyRelation, setEmergencyRelation] = useState(defaultValues.emergencyRelation ?? '')
  const [bloodType, setBloodType] = useState(defaultValues.bloodType ?? '')
  const [healthInsuranceType, setHealthInsuranceType] = useState(defaultValues.healthInsuranceType ?? '')
  const [healthInsuranceNo, setHealthInsuranceNo] = useState(defaultValues.healthInsuranceNo ?? '')
  const [pensionType, setPensionType] = useState(defaultValues.pensionType ?? '')
  const [pensionNo, setPensionNo] = useState(defaultValues.pensionNo ?? '')
  const [employmentInsuranceNo, setEmploymentInsuranceNo] = useState(defaultValues.employmentInsuranceNo ?? '')
  const [specialMedicalCheck, setSpecialMedicalCheck] = useState(defaultValues.specialMedicalCheck)
  const [lastMedicalCheckDate, setLastMedicalCheckDate] = useState(defaultValues.lastMedicalCheckDate ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)
    try {
      const res = await fetch('/api/worker/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone || null,
          address: address || null,
          emergencyName: emergencyName || null,
          emergencyPhone: emergencyPhone || null,
          emergencyRelation: emergencyRelation || null,
          bloodType: bloodType || null,
          healthInsuranceType: healthInsuranceType || null,
          healthInsuranceNo: healthInsuranceNo || null,
          pensionType: pensionType || null,
          pensionNo: pensionNo || null,
          employmentInsuranceNo: employmentInsuranceNo || null,
          specialMedicalCheck,
          lastMedicalCheckDate: lastMedicalCheckDate || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setSuccess(true)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
          <CheckCircle className="w-4 h-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 font-medium">プロフィールを更新しました</p>
        </div>
      )}
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div>
        <label className="block text-xs text-gray-500 mb-1">電話番号</label>
        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} placeholder="090-0000-0000" />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">住所</label>
        <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className={inputClass} placeholder="都道府県・市区町村・番地" />
      </div>

      <div>
        <label className="block text-xs text-gray-500 mb-1">血液型</label>
        <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className={inputClass}>
          <option value="">未設定</option>
          {['A', 'B', 'O', 'AB'].map((t) => (
            <option key={t} value={t}>{t}型</option>
          ))}
        </select>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-500 mb-3">緊急連絡先</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">氏名</label>
            <input type="text" value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} className={inputClass} placeholder="山田 花子" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">電話番号</label>
            <input type="tel" value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} className={inputClass} placeholder="090-0000-0000" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">続柄</label>
            <input type="text" value={emergencyRelation} onChange={(e) => setEmergencyRelation(e.target.value)} className={inputClass} placeholder="配偶者・親など" />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-500 mb-3">保険・年金情報</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">健康保険種別</label>
            <select value={healthInsuranceType} onChange={(e) => setHealthInsuranceType(e.target.value)} className={inputClass}>
              <option value="">選択してください</option>
              {['協会けんぽ', '組合健保', '国民健康保険', '建設国保', '後期高齢者', 'なし'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">健康保険番号</label>
            <input type="text" value={healthInsuranceNo} onChange={(e) => setHealthInsuranceNo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">年金種別</label>
            <select value={pensionType} onChange={(e) => setPensionType(e.target.value)} className={inputClass}>
              <option value="">選択してください</option>
              {['厚生年金', '国民年金', 'なし'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">年金番号</label>
            <input type="text" value={pensionNo} onChange={(e) => setPensionNo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">雇用保険番号</label>
            <input type="text" value={employmentInsuranceNo} onChange={(e) => setEmploymentInsuranceNo(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="border-t border-gray-100 pt-4">
        <p className="text-xs font-medium text-gray-500 mb-3">健康診断</p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">最終健康診断日</label>
            <input type="date" value={lastMedicalCheckDate} onChange={(e) => setLastMedicalCheckDate(e.target.value)} className={inputClass} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={specialMedicalCheck}
              onChange={(e) => setSpecialMedicalCheck(e.target.checked)}
              className="w-4 h-4 accent-orange-500"
            />
            <span className="text-sm text-gray-700">特殊健康診断 受診済み</span>
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="flex items-center gap-2 px-4 py-2.5 text-white text-sm font-bold rounded-lg disabled:opacity-50"
        style={{ backgroundColor: '#E85D04' }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
        プロフィールを保存する
      </button>
    </form>
  )
}
