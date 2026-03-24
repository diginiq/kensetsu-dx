'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface WorkerProfile {
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

interface Qualification {
  id: string
  name: string
  category: string
  certNumber: string | null
  issuedDate: Date | null
  expiresDate: Date | null
}

interface Worker {
  id: string
  name: string
  phone: string | null
  workerProfile: WorkerProfile | null
  workerQualifications: Qualification[]
}

interface EquipmentItem {
  id: string
  name: string
  model: string | null
  manufacturer: string | null
  serialNumber: string | null
  inspectionDate: Date | null
  nextInspection: Date | null
}

interface Company {
  id: string
  name: string
  address: string | null
  phone: string | null
  constructionLicense: string | null
}

interface Props {
  siteId: string
  siteName: string
  clientName: string | null
  workers: Worker[]
  equipment: EquipmentItem[]
  company: Company | null
}

const DOC_TYPES = [
  { type: 'SUBCONTRACT_NOTIFICATION', label: '再下請負通知書', desc: '様式1号 - 元請への下請負情報', icon: '📋' },
  { type: 'WORKER_ROSTER', label: 'ワーカー名簿', desc: '様式2号 - 現場ワーカーの一覧', icon: '👷' },
  { type: 'CONSTRUCTION_SYSTEM', label: '施工体制台帳', desc: '様式3号 - 施工体制の記録', icon: '🏗️' },
  { type: 'SAFETY_PLAN', label: '安全衛生計画書', desc: '様式6号 - 安全衛生の計画', icon: '🛡️' },
  { type: 'NEW_ENTRY_SURVEY', label: '新規入場者調査票', desc: '様式7号 - 新規ワーカーの情報', icon: '🆕' },
  { type: 'SAFETY_MEETING', label: '安全ミーティング報告書', desc: '様式8号 - ミーティング記録', icon: '📝' },
  { type: 'FIRE_USE_PERMIT', label: '火気使用願', desc: '様式9号 - 火気使用の許可申請', icon: '🔥' },
  { type: 'EQUIPMENT_ENTRY', label: '持込機械届', desc: '様式11号 - 持込機械の届出', icon: '🚜' },
]

export function DocumentWizard({ siteId, siteName, clientName, workers, equipment, company }: Props) {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedType, setSelectedType] = useState('')
  const [selectedWorkers, setSelectedWorkers] = useState<string[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [formData, setFormData] = useState<Record<string, unknown>>({})
  const [saving, setSaving] = useState(false)

  const selectedTypeInfo = DOC_TYPES.find((t) => t.type === selectedType)

  const handleStep1Next = () => {
    if (!selectedType) return
    const autoData: Record<string, unknown> = {
      siteName,
      clientName,
      companyName: company?.name,
      companyAddress: company?.address,
      companyPhone: company?.phone,
      constructionLicense: company?.constructionLicense,
    }
    setFormData(autoData)
    setStep(2)
  }

  const handleStep2Next = () => {
    const enrichedData = { ...formData }

    if (selectedType === 'WORKER_ROSTER' || selectedType === 'NEW_ENTRY_SURVEY') {
      enrichedData.workers = workers
        .filter((w) => selectedWorkers.includes(w.id))
        .map((w) => ({
          name: w.name,
          phone: w.phone,
          address: w.workerProfile?.address,
          bloodType: w.workerProfile?.bloodType,
          emergencyName: w.workerProfile?.emergencyName,
          emergencyPhone: w.workerProfile?.emergencyPhone,
          emergencyRelation: w.workerProfile?.emergencyRelation,
          healthInsuranceType: w.workerProfile?.healthInsuranceType,
          healthInsuranceNo: w.workerProfile?.healthInsuranceNo,
          pensionType: w.workerProfile?.pensionType,
          pensionNo: w.workerProfile?.pensionNo,
          employmentInsuranceNo: w.workerProfile?.employmentInsuranceNo,
          specialMedicalCheck: w.workerProfile?.specialMedicalCheck,
          lastMedicalCheckDate: w.workerProfile?.lastMedicalCheckDate,
          qualifications: w.workerQualifications.map((q) => ({
            name: q.name,
            category: q.category,
            certNumber: q.certNumber,
            expiresDate: q.expiresDate,
          })),
        }))
    }

    if (selectedType === 'EQUIPMENT_ENTRY') {
      enrichedData.equipment = equipment
        .filter((e) => selectedEquipment.includes(e.id))
        .map((e) => ({
          name: e.name,
          model: e.model,
          manufacturer: e.manufacturer,
          serialNumber: e.serialNumber,
          inspectionDate: e.inspectionDate,
          nextInspection: e.nextInspection,
        }))
    }

    setFormData(enrichedData)
    setStep(3)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const title = `${selectedTypeInfo?.label} - ${siteName}`
      const res = await fetch('/api/safety/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          documentType: selectedType,
          title,
          data: formData,
        }),
      })

      if (res.ok) {
        router.push(`/manage/safety/sites/${siteId}`)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAndGeneratePdf = async () => {
    setSaving(true)
    try {
      const title = `${selectedTypeInfo?.label} - ${siteName}`
      const res = await fetch('/api/safety/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteId,
          documentType: selectedType,
          title,
          data: formData,
        }),
      })

      if (res.ok) {
        const doc = await res.json()
        const pdfRes = await fetch(`/api/safety/documents/${doc.id}/generate-pdf`, { method: 'POST' })
        if (pdfRes.ok) {
          const blob = await pdfRes.blob()
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${title}.pdf`
          a.click()
          URL.revokeObjectURL(url)
        }
        router.push(`/manage/safety/sites/${siteId}`)
        router.refresh()
      }
    } finally {
      setSaving(false)
    }
  }

  const inputClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'

  return (
    <div>
      {/* ステップインジケータ */}
      <div className="flex items-center gap-2 mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                s <= step ? 'text-white' : 'bg-gray-200 text-gray-500'
              }`}
              style={s <= step ? { backgroundColor: '#E85D04' } : {}}
            >
              {s}
            </div>
            <span className={`text-sm ${s <= step ? 'text-gray-800 font-medium' : 'text-gray-400'}`}>
              {s === 1 && '種別選択'}
              {s === 2 && '入力'}
              {s === 3 && 'プレビュー'}
              {s === 4 && '保存'}
            </span>
            {s < 4 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: 書類種別選択 */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">作成する書類の種別を選択してください</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DOC_TYPES.map((dt) => (
              <button
                key={dt.type}
                onClick={() => setSelectedType(dt.type)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  selectedType === dt.type
                    ? 'border-orange-400 bg-orange-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{dt.icon}</span>
                  <div>
                    <p className="font-bold text-gray-800">{dt.label}</p>
                    <p className="text-sm text-gray-500">{dt.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
          <div className="flex justify-end pt-4">
            <button
              onClick={handleStep1Next}
              disabled={!selectedType}
              className="px-6 py-2 text-white font-bold rounded-lg text-sm disabled:opacity-50"
              style={{ backgroundColor: '#E85D04' }}
            >
              次へ
            </button>
          </div>
        </div>
      )}

      {/* Step 2: 入力フォーム */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold text-gray-700 mb-4">{selectedTypeInfo?.label} - 入力</h2>

            {/* 会社・現場情報（自動入力） */}
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <p className="text-xs text-gray-500 mb-2">自動入力済み</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">会社名:</span> <span className="font-medium">{company?.name}</span></div>
                <div><span className="text-gray-500">現場名:</span> <span className="font-medium">{siteName}</span></div>
                <div><span className="text-gray-500">住所:</span> <span className="font-medium">{company?.address ?? '-'}</span></div>
                <div><span className="text-gray-500">電話:</span> <span className="font-medium">{company?.phone ?? '-'}</span></div>
              </div>
            </div>

            {/* ワーカー選択（名簿・新規入場者） */}
            {(selectedType === 'WORKER_ROSTER' || selectedType === 'NEW_ENTRY_SURVEY') && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  対象ワーカーを選択 ({selectedWorkers.length}/{workers.length}名)
                </p>
                {workers.length === 0 ? (
                  <p className="text-sm text-gray-400">この現場に割り当てられたワーカーがいません</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {workers.map((w) => (
                      <label
                        key={w.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                          selectedWorkers.includes(w.id)
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedWorkers.includes(w.id)}
                          onChange={(e) => {
                            setSelectedWorkers(
                              e.target.checked
                                ? [...selectedWorkers, w.id]
                                : selectedWorkers.filter((id) => id !== w.id)
                            )
                          }}
                          className="w-4 h-4 accent-orange-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{w.name}</p>
                          <p className="text-xs text-gray-500">
                            資格: {w.workerQualifications.length}件
                            {w.workerProfile ? ' ・ プロフィール登録済み' : ' ・ プロフィール未登録'}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedWorkers(workers.map((w) => w.id))}
                  className="mt-2 text-sm text-orange-600 hover:text-orange-700"
                >
                  全員選択
                </button>
              </div>
            )}

            {/* 機械選択（持込機械届） */}
            {selectedType === 'EQUIPMENT_ENTRY' && (
              <div className="mb-4">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  持込機械を選択 ({selectedEquipment.length}/{equipment.length}台)
                </p>
                {equipment.length === 0 ? (
                  <p className="text-sm text-gray-400">機械が登録されていません。先に機械マスタで登録してください。</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {equipment.map((eq) => (
                      <label
                        key={eq.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer ${
                          selectedEquipment.includes(eq.id)
                            ? 'border-orange-400 bg-orange-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedEquipment.includes(eq.id)}
                          onChange={(e) => {
                            setSelectedEquipment(
                              e.target.checked
                                ? [...selectedEquipment, eq.id]
                                : selectedEquipment.filter((id) => id !== eq.id)
                            )
                          }}
                          className="w-4 h-4 accent-orange-500"
                        />
                        <div>
                          <p className="text-sm font-medium text-gray-800">{eq.name}</p>
                          <p className="text-xs text-gray-500">
                            {eq.manufacturer ?? ''} {eq.model ?? ''} {eq.serialNumber ? `(${eq.serialNumber})` : ''}
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 再下請負通知書の追加フィールド */}
            {selectedType === 'SUBCONTRACT_NOTIFICATION' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">工事名称</label>
                  <input
                    className={inputClass}
                    value={(formData.constructionName as string) ?? ''}
                    onChange={(e) => setFormData({ ...formData, constructionName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">工期（自）</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={(formData.periodFrom as string) ?? ''}
                    onChange={(e) => setFormData({ ...formData, periodFrom: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">工期（至）</label>
                  <input
                    type="date"
                    className={inputClass}
                    value={(formData.periodTo as string) ?? ''}
                    onChange={(e) => setFormData({ ...formData, periodTo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">契約金額</label>
                  <input
                    className={inputClass}
                    value={(formData.contractAmount as string) ?? ''}
                    onChange={(e) => setFormData({ ...formData, contractAmount: e.target.value })}
                  />
                </div>
              </div>
            )}

            {/* 汎用メモフィールド */}
            <div className="mt-4">
              <label className="block text-sm text-gray-600 mb-1">備考</label>
              <textarea
                className={inputClass}
                rows={3}
                value={(formData.remarks as string) ?? ''}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="補足事項があれば入力してください"
              />
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(1)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
              戻る
            </button>
            <button
              onClick={handleStep2Next}
              className="px-6 py-2 text-white font-bold rounded-lg text-sm"
              style={{ backgroundColor: '#E85D04' }}
            >
              プレビュー
            </button>
          </div>
        </div>
      )}

      {/* Step 3: プレビュー */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="font-bold text-gray-700 mb-4">プレビュー - {selectedTypeInfo?.label}</h2>

            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-gray-500">会社名:</span> <span className="font-medium">{formData.companyName as string}</span></div>
                <div><span className="text-gray-500">現場名:</span> <span className="font-medium">{formData.siteName as string}</span></div>
              </div>

              {(formData.workers as Array<Record<string, unknown>>)?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    ワーカー ({(formData.workers as Array<Record<string, unknown>>).length}名)
                  </p>
                  <div className="space-y-1">
                    {(formData.workers as Array<{ name: string; bloodType?: string; qualifications?: Array<{ name: string }> }>).map((w, i) => (
                      <div key={i} className="text-sm bg-white rounded p-2 border border-gray-200">
                        <span className="font-medium">{w.name}</span>
                        {w.bloodType && <span className="text-gray-500 ml-2">({w.bloodType}型)</span>}
                        {w.qualifications && w.qualifications.length > 0 && (
                          <span className="text-gray-500 ml-2">
                            資格: {w.qualifications.map((q) => q.name).join('、')}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(formData.equipment as Array<Record<string, unknown>>)?.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    持込機械 ({(formData.equipment as Array<Record<string, unknown>>).length}台)
                  </p>
                  <div className="space-y-1">
                    {(formData.equipment as Array<{ name: string; manufacturer?: string; model?: string }>).map((eq, i) => (
                      <div key={i} className="text-sm bg-white rounded p-2 border border-gray-200">
                        <span className="font-medium">{eq.name}</span>
                        <span className="text-gray-500 ml-2">{eq.manufacturer} {eq.model}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {typeof formData.remarks === 'string' && formData.remarks && (
                <div>
                  <p className="text-sm font-medium text-gray-700">備考</p>
                  <p className="text-sm text-gray-600">{formData.remarks}</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-between pt-4">
            <button onClick={() => setStep(2)} className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium">
              戻る
            </button>
            <div className="flex gap-3">
              <button
                onClick={() => { setStep(4); handleSave() }}
                disabled={saving}
                className="px-6 py-2 bg-gray-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {saving ? '保存中...' : '下書き保存'}
              </button>
              <button
                onClick={() => { setStep(4); handleSaveAndGeneratePdf() }}
                disabled={saving}
                className="px-6 py-2 text-white font-bold rounded-lg text-sm disabled:opacity-50"
                style={{ backgroundColor: '#E85D04' }}
              >
                {saving ? '生成中...' : 'PDF生成・保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: 完了 */}
      {step === 4 && saving && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
          <div className="animate-spin w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-gray-600">書類を保存しています...</p>
        </div>
      )}
    </div>
  )
}
