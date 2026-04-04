'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import type { SafetyDocType, Prisma } from '@prisma/client'
import { notifyUsers } from '@/lib/appNotifications'

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
    include: { site: { select: { name: true } } },
  })
  if (!doc) throw new Error('書類が見つかりません')

  await prisma.safetyDocument.update({
    where: { id: docId },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  })

  // 管理者に通知
  const admins = await prisma.user.findMany({
    where: { companyId: session.user.companyId, role: 'COMPANY_ADMIN', isActive: true },
    select: { id: true },
  })
  if (admins.length > 0) {
    notifyUsers(admins.map((a) => a.id), {
      title: '安全書類が提出されました',
      body: `${doc.title}（${doc.site.name}）の確認をしてください`,
      url: `/manage/safety/sites/${doc.siteId}`,
    }).catch(() => {})
  }

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

export async function acceptSafetyDocument(docId: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN') throw new Error('権限なし')

  const doc = await prisma.safetyDocument.findFirst({
    where: { id: docId, companyId: session.user.companyId ?? undefined },
    include: { site: { select: { name: true } } },
  })
  if (!doc) throw new Error('書類が見つかりません')
  if (doc.status !== 'SUBMITTED') throw new Error('提出済み書類のみ受理できます')

  await prisma.safetyDocument.update({
    where: { id: docId },
    data: { status: 'ACCEPTED', reviewedAt: new Date(), reviewComment: null },
  })

  // 現場の配属ワーカーに通知
  const assignments = await prisma.siteAssignment.findMany({
    where: { siteId: doc.siteId },
    select: { userId: true },
  })
  if (assignments.length > 0) {
    notifyUsers(assignments.map((a) => a.userId), {
      title: '安全書類が受理されました',
      body: `${doc.title}（${doc.site.name}）が受理されました`,
      url: `/app/settings`,
    }).catch(() => {})
  }

  revalidatePath(`/manage/safety/sites/${doc.siteId}`)
  revalidatePath('/manage/safety')
}

export async function rejectSafetyDocument(docId: string, comment: string) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN') throw new Error('権限なし')

  const doc = await prisma.safetyDocument.findFirst({
    where: { id: docId, companyId: session.user.companyId ?? undefined },
    include: { site: { select: { name: true } } },
  })
  if (!doc) throw new Error('書類が見つかりません')
  if (doc.status !== 'SUBMITTED') throw new Error('提出済み書類のみ差し戻せます')

  await prisma.safetyDocument.update({
    where: { id: docId },
    data: { status: 'REJECTED', reviewedAt: new Date(), reviewComment: comment || null },
  })

  // 現場の配属ワーカーに通知
  const assignments = await prisma.siteAssignment.findMany({
    where: { siteId: doc.siteId },
    select: { userId: true },
  })
  if (assignments.length > 0) {
    notifyUsers(assignments.map((a) => a.userId), {
      title: '安全書類が差し戻されました',
      body: `${doc.title}（${doc.site.name}）${comment ? `：${comment}` : ''}`,
      url: `/app/settings`,
    }).catch(() => {})
  }

  revalidatePath(`/manage/safety/sites/${doc.siteId}`)
  revalidatePath('/manage/safety')
}
