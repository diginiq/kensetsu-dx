'use server'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { revalidatePath } from 'next/cache'

export async function updateCompany(
  _prevState: { error: string; success: boolean } | null,
  formData: FormData,
): Promise<{ error: string; success: boolean }> {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) return { error: '認証エラーが発生しました', success: false }

  const name = (formData.get('name') as string).trim()
  if (!name) return { error: '会社名は必須です', success: false }

  try {
    await prisma.company.update({
      where: { id: session.user.companyId },
      data: {
        name,
        address: (formData.get('address') as string) || null,
        phone: (formData.get('phone') as string) || null,
        constructionLicense: (formData.get('constructionLicense') as string) || null,
      },
    })
  } catch {
    return { error: '保存中にエラーが発生しました', success: false }
  }

  revalidatePath('/manage/company')
  revalidatePath('/manage')
  return { error: '', success: true }
}
