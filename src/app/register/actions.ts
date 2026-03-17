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
  try {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { success: false, error: 'このメールアドレスはすでに登録されています' }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: { name: companyName, status: 'TRIAL' },
      })

      await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: 'COMPANY_ADMIN',
          companyId: company.id,
        },
      })
    })

    return { success: true }
  } catch (err) {
    console.error('[registerUser] エラー:', err)
    return { success: false, error: 'サーバーエラーが発生しました。もう一度お試しください。' }
  }
}
