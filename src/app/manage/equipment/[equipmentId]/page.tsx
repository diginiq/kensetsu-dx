import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import Link from 'next/link'
import { InspectionHistory } from './InspectionHistory'

export default async function EquipmentDetailPage({ params }: { params: { equipmentId: string } }) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const equipment = await prisma.equipment.findFirst({
    where: { id: params.equipmentId, companyId: session.user.companyId },
  })
  if (!equipment) redirect('/manage/equipment')

  const now = new Date()
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const inspectionStatus = equipment.nextInspection
    ? equipment.nextInspection < now ? 'expired'
    : equipment.nextInspection <= in30Days ? 'warning' : 'ok'
    : 'none'

  const statusStyle = {
    expired: 'bg-red-50 border-red-300 text-red-700',
    warning: 'bg-yellow-50 border-yellow-300 text-yellow-700',
    ok: 'bg-green-50 border-green-300 text-green-700',
    none: 'bg-gray-50 border-gray-200 text-gray-500',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/manage/equipment" className="text-sm text-gray-500 hover:text-gray-700">
          ← 機材一覧
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-800">{equipment.name}</h1>
        {equipment.model && <p className="text-sm text-gray-500 mt-0.5">型式: {equipment.model}</p>}
      </div>

      {/* 機材詳細カード */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-bold text-gray-700 mb-4">機材情報</h2>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['メーカー', equipment.manufacturer],
            ['製造番号', equipment.serialNumber],
            ['最終点検日', equipment.inspectionDate ? equipment.inspectionDate.toLocaleDateString('ja-JP') : null],
            ['点検周期', equipment.inspectionCycle
              ? equipment.inspectionCycle === 1 ? '毎月'
              : equipment.inspectionCycle === 12 ? '年次（12ヶ月）'
              : equipment.inspectionCycle === 24 ? '2年（24ヶ月）'
              : `${equipment.inspectionCycle}ヶ月` : null],
          ].map(([label, value]) =>
            value ? (
              <div key={label as string}>
                <dt className="text-gray-500 text-xs">{label}</dt>
                <dd className="font-medium text-gray-800 mt-0.5">{value}</dd>
              </div>
            ) : null
          )}
        </dl>

        {/* 次回点検日 */}
        <div className={`mt-4 p-3 rounded-lg border ${statusStyle[inspectionStatus]}`}>
          <p className="text-xs font-medium mb-0.5">次回点検予定日</p>
          <p className="font-bold">
            {equipment.nextInspection
              ? equipment.nextInspection.toLocaleDateString('ja-JP')
              : '未設定'}
          </p>
          {inspectionStatus === 'expired' && (
            <p className="text-xs mt-1">点検期限が過ぎています。早急に点検を実施してください。</p>
          )}
          {inspectionStatus === 'warning' && (
            <p className="text-xs mt-1">30日以内に点検期限が到来します。</p>
          )}
        </div>
      </div>

      {/* 点検履歴 */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <InspectionHistory
          equipmentId={equipment.id}
          equipmentName={equipment.name}
          inspectionCycle={equipment.inspectionCycle ?? null}
        />
      </div>
    </div>
  )
}
