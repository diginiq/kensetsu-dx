'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'
import { checkWorkerLimit } from '@/lib/planLimits'

export async function resetWorkerPassword(
  workerId: string,
  newPassword: string,
): Promise<{ error: string } | null> {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) return { error: '認証エラーが発生しました' }

  if (newPassword.length < 8) return { error: 'パスワードは8文字以上で入力してください' }

  const worker = await prisma.user.findFirst({
    where: { id: workerId, companyId: session.user.companyId, role: 'WORKER' },
  })
  if (!worker) return { error: '従業員が見つかりません' }

  const passwordHash = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: workerId }, data: { passwordHash } })

  return null
}

export async function createWorker(
  _prevState: { error: string } | null,
  formData: FormData,
): Promise<{ error: string } | null> {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) return { error: '認証エラーが発生しました' }

  const email = formData.get('email') as string
  const name = formData.get('name') as string
  const phone = (formData.get('phone') as string) || null
  const password = formData.get('password') as string
  const roleRaw = (formData.get('role') as string) || 'WORKER'
  const allowedRoles = ['WORKER', 'FOREMAN', 'SITE_SUPERVISOR'] as const
  const role = allowedRoles.includes(roleRaw as typeof allowedRoles[number])
    ? (roleRaw as typeof allowedRoles[number])
    : 'WORKER'

  if (!name || !email || !password) return { error: '必須項目を入力してください' }
  if (password.length < 8) return { error: 'パスワードは8文字以上で入力してください' }

  const limitError = await checkWorkerLimit(session.user.companyId)
  if (limitError) return { error: limitError }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'このメールアドレスはすでに使用されています' }

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      email,
      name,
      phone,
      passwordHash,
      role,
      companyId: session.user.companyId,
    },
  })

  revalidatePath('/manage/workers')
  return null
}

export async function bulkToggleWorkerStatus(workerIds: string[], isActive: boolean) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  // テナント確認：指定IDが全て同社内か検証
  const count = await prisma.user.count({
    where: {
      id: { in: workerIds },
      companyId: session.user.companyId,
      role: { in: ['WORKER', 'FOREMAN', 'SITE_SUPERVISOR'] },
    },
  })
  if (count !== workerIds.length) throw new Error('権限なし')

  await prisma.user.updateMany({
    where: { id: { in: workerIds } },
    data: { isActive },
  })

  revalidatePath('/manage/workers')
}

export async function updateWorkerRole(workerId: string, role: 'WORKER' | 'FOREMAN' | 'SITE_SUPERVISOR') {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const worker = await prisma.user.findFirst({
    where: { id: workerId, companyId: session.user.companyId },
  })
  if (!worker) throw new Error('従業員が見つかりません')
  if (worker.role === 'COMPANY_ADMIN' || worker.role === 'SUPER_ADMIN') throw new Error('この権限は変更できません')

  await prisma.user.update({ where: { id: workerId }, data: { role } })
  revalidatePath('/manage/workers')
}

export async function toggleWorkerStatus(workerId: string, isActive: boolean) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  // テナント確認
  const worker = await prisma.user.findFirst({
    where: { id: workerId, companyId: session.user.companyId },
  })
  if (!worker) throw new Error('ワーカーが見つかりません')

  await prisma.user.update({
    where: { id: workerId },
    data: { isActive },
  })

  revalidatePath('/manage/workers')
}
