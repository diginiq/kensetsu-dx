'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateCompany(formData: FormData) {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) throw new Error('認証エラー')

  await prisma.company.update({
    where: { id: session.user.companyId },
    data: {
      name: formData.get('name') as string,
      address: (formData.get('address') as string) || null,
      phone: (formData.get('phone') as string) || null,
      constructionLicense: (formData.get('constructionLicense') as string) || null,
    },
  })

  revalidatePath('/manage/company')
  revalidatePath('/manage')
}
