'use client'

import { upsertWorkerProfile } from './actions'

interface WorkerProfile {
  id: string
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
  lastMedicalCheckDate: Date | null
}

interface Props {
  userId: string
  profile: WorkerProfile | null
}

function formatDate(date: Date | null): string {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

export function ProfileForm({ userId, profile }: Props) {
  const handleSubmit = async (formData: FormData) => {
    await upsertWorkerProfile(userId, formData)
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'
  const labelClass = 'block text-sm text-gray-600 mb-1 font-medium'

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* 基本情報 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-bold text-gray-700 mb-4">基本情報</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>住所</label>
            <input name="address" defaultValue={profile?.address ?? ''} className={inputClass} placeholder="東京都○○区..." />
          </div>
          <div>
            <label className={labelClass}>血液型</label>
            <select name="bloodType" defaultValue={profile?.bloodType ?? ''} className={inputClass}>
              <option value="">選択してください</option>
              <option value="A">A型</option>
              <option value="B">B型</option>
              <option value="O">O型</option>
              <option value="AB">AB型</option>
            </select>
          </div>
        </div>
      </div>

      {/* 緊急連絡先 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-bold text-gray-700 mb-4">緊急連絡先</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>氏名</label>
            <input name="emergencyName" defaultValue={profile?.emergencyName ?? ''} className={inputClass} placeholder="山田 花子" />
          </div>
          <div>
            <label className={labelClass}>電話番号</label>
            <input name="emergencyPhone" defaultValue={profile?.emergencyPhone ?? ''} className={inputClass} placeholder="090-0000-0000" />
          </div>
          <div>
            <label className={labelClass}>続柄</label>
            <input name="emergencyRelation" defaultValue={profile?.emergencyRelation ?? ''} className={inputClass} placeholder="配偶者" />
          </div>
        </div>
      </div>

      {/* 保険情報 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-bold text-gray-700 mb-4">保険・年金情報</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>健康保険種別</label>
            <select name="healthInsuranceType" defaultValue={profile?.healthInsuranceType ?? ''} className={inputClass}>
              <option value="">選択してください</option>
              <option value="協会けんぽ">協会けんぽ</option>
              <option value="組合健保">組合健保</option>
              <option value="国民健康保険">国民健康保険</option>
              <option value="建設国保">建設国保</option>
              <option value="後期高齢者">後期高齢者</option>
              <option value="なし">適用除外</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>健康保険番号</label>
            <input name="healthInsuranceNo" defaultValue={profile?.healthInsuranceNo ?? ''} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>年金種別</label>
            <select name="pensionType" defaultValue={profile?.pensionType ?? ''} className={inputClass}>
              <option value="">選択してください</option>
              <option value="厚生年金">厚生年金</option>
              <option value="国民年金">国民年金</option>
              <option value="なし">適用除外</option>
            </select>
          </div>
          <div>
            <label className={labelClass}>年金番号</label>
            <input name="pensionNo" defaultValue={profile?.pensionNo ?? ''} className={inputClass} />
          </div>
          <div>
            <label className={labelClass}>雇用保険番号</label>
            <input name="employmentInsuranceNo" defaultValue={profile?.employmentInsuranceNo ?? ''} className={inputClass} />
          </div>
        </div>
      </div>

      {/* 健康診断 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <h2 className="font-bold text-gray-700 mb-4">健康診断</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>最終健康診断日</label>
            <input
              name="lastMedicalCheckDate"
              type="date"
              defaultValue={formatDate(profile?.lastMedicalCheckDate ?? null)}
              className={inputClass}
            />
          </div>
          <div className="flex items-center pt-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                name="specialMedicalCheck"
                type="checkbox"
                defaultChecked={profile?.specialMedicalCheck ?? false}
                className="w-4 h-4 accent-orange-500"
              />
              <span className="text-sm text-gray-700">特殊健康診断 受診済み</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          className="px-6 py-2 text-white font-bold rounded-lg text-sm"
          style={{ backgroundColor: '#E85D04' }}
        >
          プロフィールを保存
        </button>
      </div>
    </form>
  )
}
