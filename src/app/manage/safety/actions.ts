'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import type { SafetyDocType, Prisma } from '@prisma/client'

export async function createSafetyDocument(
  siteId: string,
  documentType: SafetyDocType,
  title: string,
  data: Prisma.InputJsonValue
) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId },
  })
  if (!site) throw new Error('現場が見つかりません')

  const doc = await prisma.safetyDocument.create({
    data: {
      companyId: session.user.companyId,
      siteId,
      documentType,
      title,
      data,
    },
  })

  revalidatePath(`/manage/safety/sites/${siteId}`)
  revalidatePath('/manage/safety')
  return doc
}

export async function updateSafetyDocument(
  docId: string,
  data: Prisma.InputJsonValue
) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const doc = await prisma.safetyDocument.findFirst({
    where: { id: docId, companyId: session.user.companyId },
  })
  if (!doc) throw new Error('書類が見つかりません')
  if (doc.status === 'ACCEPTED') throw new Error('受理済み書類は編集できません')

  const updated = await prisma.safetyDocument.update({
    where: { id: docId },
    data: { data, status: 'DRAFT', generatedPdfKey: null },
  })

  revalidatePath(`/manage/safety/sites/${doc.siteId}`)
  revalidatePath('/manage/safety')
  return updated
}

export async function submitSafetyDocument(docId: string) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const doc = await prisma.safetyDocument.findFirst({
    where: { id: docId, companyId: session.user.companyId },
  })
  if (!doc) throw new Error('書類が見つかりません')

  await prisma.safetyDocument.update({
    where: { id: docId },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })

  revalidatePath(`/manage/safety/sites/${doc.siteId}`)
  revalidatePath('/manage/safety')
}

export async function deleteSafetyDocument(docId: string) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const doc = await prisma.safetyDocument.findFirst({
    where: { id: docId, companyId: session.user.companyId },
  })
  if (!doc) throw new Error('書類が見つかりません')

  await prisma.safetyDocument.delete({ where: { id: docId } })

  revalidatePath(`/manage/safety/sites/${doc.siteId}`)
  revalidatePath('/manage/safety')
}
