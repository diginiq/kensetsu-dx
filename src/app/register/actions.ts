'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'

type RegisterResult =
  | { success: true }
  | { success: false; error: string }

export async function registerUser(
  companyName: string,
  name: string,
  email: string,
  password: string,
): Promise<RegisterResult> {
  // メールアドレス重複チェック
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return { success: false, error: 'このメールアドレスはすでに登録されています' }
  }

  const passwordHash = await bcrypt.hash(password, 12)

  // 会社とユーザーをトランザクションで同時作成
  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: { name: companyName },
    })

    await tx.user.create({
      data: {
        email,
        name,
        passwordHash,
        role: 'OWNER',
        companyId: company.id,
      },
    })
  })

  return { success: true }
}
