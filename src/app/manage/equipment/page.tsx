import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { EquipmentManager } from './EquipmentManager'

export default async function EquipmentPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const equipment = await prisma.equipment.findMany({
    where: { companyId: session.user.companyId },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">機械マスタ管理</h1>
      <EquipmentManager equipment={equipment} />
    </div>
  )
}
