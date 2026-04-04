'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function createEquipment(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  await prisma.equipment.create({
    data: {
      companyId: session.user.companyId,
      name: formData.get('name') as string,
      model: (formData.get('model') as string) || null,
      manufacturer: (formData.get('manufacturer') as string) || null,
      serialNumber: (formData.get('serialNumber') as string) || null,
      inspectionDate: formData.get('inspectionDate')
        ? new Date(formData.get('inspectionDate') as string)
        : null,
      nextInspection: formData.get('nextInspection')
        ? new Date(formData.get('nextInspection') as string)
        : null,
      inspectionCycle: formData.get('inspectionCycle')
        ? parseInt(formData.get('inspectionCycle') as string)
        : null,
    },
  })

  revalidatePath('/manage/equipment')
}

export async function updateEquipment(equipmentId: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const eq = await prisma.equipment.findFirst({
    where: { id: equipmentId, companyId: session.user.companyId },
  })
  if (!eq) throw new Error('機械が見つかりません')

  await prisma.equipment.update({
    where: { id: equipmentId },
    data: {
      name: formData.get('name') as string,
      model: (formData.get('model') as string) || null,
      manufacturer: (formData.get('manufacturer') as string) || null,
      serialNumber: (formData.get('serialNumber') as string) || null,
      inspectionDate: formData.get('inspectionDate')
        ? new Date(formData.get('inspectionDate') as string)
        : null,
      nextInspection: formData.get('nextInspection')
        ? new Date(formData.get('nextInspection') as string)
        : null,
      inspectionCycle: formData.get('inspectionCycle')
        ? parseInt(formData.get('inspectionCycle') as string)
        : null,
    },
  })

  revalidatePath('/manage/equipment')
}

export async function deleteEquipment(equipmentId: string) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const eq = await prisma.equipment.findFirst({
    where: { id: equipmentId, companyId: session.user.companyId },
  })
  if (!eq) throw new Error('機械が見つかりません')

  await prisma.equipment.delete({ where: { id: equipmentId } })

  revalidatePath('/manage/equipment')
}
