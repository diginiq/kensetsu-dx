'use server'

import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

export async function createCompany(formData: FormData) {
  const companyName = formData.get('companyName') as string
  const adminName = formData.get('adminName') as string
  const adminEmail = formData.get('adminEmail') as string
  const adminPassword = formData.get('adminPassword') as string
  const status = (formData.get('status') as string) || 'TRIAL'

  if (!companyName || !adminName || !adminEmail || !adminPassword) {
    throw new Error('必須項目を入力してください')
  }

  const existing = await prisma.user.findUnique({ where: { email: adminEmail } })
  if (existing) {
    throw new Error('このメールアドレスはすでに使用されています')
  }

  const passwordHash = await bcrypt.hash(adminPassword, 12)

  await prisma.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        name: companyName,
        status: status as 'ACTIVE' | 'SUSPENDED' | 'TRIAL',
      },
    })
    await tx.user.create({
      data: {
        email: adminEmail,
        name: adminName,
        passwordHash,
        role: 'COMPANY_ADMIN',
        companyId: company.id,
      },
    })
  })

  revalidatePath('/admin/companies')
  redirect('/admin/companies')
}
