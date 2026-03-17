'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function assignWorkers(siteId: string, userIds: string[]) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  // テナント確認
  const site = await prisma.site.findFirst({
    where: { id: siteId, companyId: session.user.companyId },
  })
  if (!site) throw new Error('現場が見つかりません')

  // 既存の割り当てを削除して再作成
  await prisma.$transaction([
    prisma.siteAssignment.deleteMany({ where: { siteId } }),
    prisma.siteAssignment.createMany({
      data: userIds.map((userId) => ({ siteId, userId })),
      skipDuplicates: true,
    }),
  ])

  revalidatePath('/manage/sites')
}

export async function toggleSiteStatus(siteId: string, status: 'ACTIVE' | 'SUSPENDED') {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  await prisma.site.updateMany({
    where: { id: siteId, companyId: session.user.companyId },
    data: { status },
  })

  revalidatePath('/manage/sites')
}
