'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import bcrypt from 'bcryptjs'

export async function createWorker(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  const email = formData.get('email') as string
  const name = formData.get('name') as string
  const phone = (formData.get('phone') as string) || null
  const password = formData.get('password') as string

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) throw new Error('このメールアドレスはすでに使用されています')

  const passwordHash = await bcrypt.hash(password, 12)

  await prisma.user.create({
    data: {
      email,
      name,
      phone,
      passwordHash,
      role: 'WORKER',
      companyId: session.user.companyId,
    },
  })

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
