import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { PushSubscribeSection } from '@/components/features/push/PushSubscribeSection'
import { PhotoSettingsSection } from '@/components/features/settings/PhotoSettingsSection'
import { CompanyForm } from '@/components/features/company/CompanyForm'
import { ChangePasswordForm } from '@/components/features/auth/ChangePasswordForm'
import { LogoUpload } from '@/components/features/settings/LogoUpload'

export default async function ManageCompanyPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
    select: {
      name: true, address: true, phone: true,
      constructionLicense: true, logoUrl: true,
    },
  })

  if (!company) redirect('/login')

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">会社情報</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
        <h2 className="font-bold text-gray-800">会社ロゴ</h2>
        <LogoUpload currentLogoUrl={company.logoUrl ?? null} />
      </div>

      <CompanyForm
        defaultValues={{
          name: company.name,
          address: company.address,
          phone: company.phone,
          constructionLicense: company.constructionLicense,
        }}
      />

      <PhotoSettingsSection />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
        <h2 className="font-bold text-gray-800">プッシュ通知（メッセージ）</h2>
        <PushSubscribeSection swScript="/sw-manage-push.js" scope="/manage/" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
        <h2 className="font-bold text-gray-800">パスワード変更</h2>
        <ChangePasswordForm />
      </div>
    </div>
  )
}
