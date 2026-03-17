'use server'

import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateCompanyStatus(companyId: string, status: 'ACTIVE' | 'SUSPENDED' | 'TRIAL') {
  await prisma.company.update({
    where: { id: companyId },
    data: { status },
  })
  revalidatePath(`/admin/companies/${companyId}`)
  revalidatePath('/admin/companies')
}

export async function updateCompanyInfo(companyId: string, formData: FormData) {
  const name = formData.get('name') as string
  const address = formData.get('address') as string
  const phone = formData.get('phone') as string
  const constructionLicense = formData.get('constructionLicense') as string
  const plan = formData.get('plan') as string

  await prisma.company.update({
    where: { id: companyId },
    data: {
      name,
      address: address || null,
      phone: phone || null,
      constructionLicense: constructionLicense || null,
      plan: plan as 'FREE' | 'STANDARD' | 'PREMIUM',
    },
  })
  revalidatePath(`/admin/companies/${companyId}`)
}
