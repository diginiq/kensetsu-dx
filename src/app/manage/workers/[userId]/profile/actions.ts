'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function upsertWorkerProfile(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const worker = await prisma.user.findFirst({
    where: { id: userId, companyId: session.user.companyId },
  })
  if (!worker) throw new Error('ワーカーが見つかりません')

  const data = {
    address: (formData.get('address') as string) || null,
    emergencyName: (formData.get('emergencyName') as string) || null,
    emergencyPhone: (formData.get('emergencyPhone') as string) || null,
    emergencyRelation: (formData.get('emergencyRelation') as string) || null,
    bloodType: (formData.get('bloodType') as string) || null,
    healthInsuranceType: (formData.get('healthInsuranceType') as string) || null,
    healthInsuranceNo: (formData.get('healthInsuranceNo') as string) || null,
    pensionType: (formData.get('pensionType') as string) || null,
    pensionNo: (formData.get('pensionNo') as string) || null,
    employmentInsuranceNo: (formData.get('employmentInsuranceNo') as string) || null,
    specialMedicalCheck: formData.get('specialMedicalCheck') === 'on',
    lastMedicalCheckDate: formData.get('lastMedicalCheckDate')
      ? new Date(formData.get('lastMedicalCheckDate') as string)
      : null,
  }

  await prisma.workerProfile.upsert({
    where: { userId },
    create: { userId, ...data },
    update: data,
  })

  revalidatePath(`/manage/workers/${userId}/profile`)
}

export async function createQualification(userId: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const worker = await prisma.user.findFirst({
    where: { id: userId, companyId: session.user.companyId },
  })
  if (!worker) throw new Error('ワーカーが見つかりません')

  await prisma.workerQualification.create({
    data: {
      userId,
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      certNumber: (formData.get('certNumber') as string) || null,
      issuedDate: formData.get('issuedDate')
        ? new Date(formData.get('issuedDate') as string)
        : null,
      expiresDate: formData.get('expiresDate')
        ? new Date(formData.get('expiresDate') as string)
        : null,
      issuedBy: (formData.get('issuedBy') as string) || null,
    },
  })

  revalidatePath(`/manage/workers/${userId}/profile`)
}

export async function updateQualification(qualId: string, userId: string, formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const qual = await prisma.workerQualification.findFirst({
    where: { id: qualId, user: { companyId: session.user.companyId } },
  })
  if (!qual) throw new Error('資格が見つかりません')

  await prisma.workerQualification.update({
    where: { id: qualId },
    data: {
      name: formData.get('name') as string,
      category: formData.get('category') as string,
      certNumber: (formData.get('certNumber') as string) || null,
      issuedDate: formData.get('issuedDate')
        ? new Date(formData.get('issuedDate') as string)
        : null,
      expiresDate: formData.get('expiresDate')
        ? new Date(formData.get('expiresDate') as string)
        : null,
      issuedBy: (formData.get('issuedBy') as string) || null,
    },
  })

  revalidatePath(`/manage/workers/${userId}/profile`)
}

export async function deleteQualification(qualId: string, userId: string) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const qual = await prisma.workerQualification.findFirst({
    where: { id: qualId, user: { companyId: session.user.companyId } },
  })
  if (!qual) throw new Error('資格が見つかりません')

  await prisma.workerQualification.delete({ where: { id: qualId } })

  revalidatePath(`/manage/workers/${userId}/profile`)
}
