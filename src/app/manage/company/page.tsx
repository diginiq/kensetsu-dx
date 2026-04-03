import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { updateCompany } from './actions'
import { PushSubscribeSection } from '@/components/features/push/PushSubscribeSection'
import { PhotoSettingsSection } from '@/components/features/settings/PhotoSettingsSection'

export default async function ManageCompanyPage() {
  const session = await getServerSession(authOptions)
  if (!session || !session.user.companyId) redirect('/login')

  const company = await prisma.company.findUnique({
    where: { id: session.user.companyId },
  })

  if (!company) redirect('/login')

  return (
    <div className="max-w-lg space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">会社情報</h1>

      <form action={updateCompany} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            会社名 <span className="text-red-500">*</span>
          </label>
          <input
            name="name"
            required
            defaultValue={company.name}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
          <input
            name="address"
            defaultValue={company.address ?? ''}
            placeholder="東京都〇〇区..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
          <input
            name="phone"
            defaultValue={company.phone ?? ''}
            placeholder="03-0000-0000"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">建設業許可番号</label>
          <input
            name="constructionLicense"
            defaultValue={company.constructionLicense ?? ''}
            placeholder="国土交通大臣許可（特-〇〇）第〇〇号"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="submit"
          className="w-full py-3 text-white font-bold rounded-lg text-base"
          style={{ backgroundColor: '#E85D04' }}
        >
          保存する
        </button>
      </form>

      <PhotoSettingsSection />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-3">
        <h2 className="font-bold text-gray-800">プッシュ通知（メッセージ）</h2>
        <PushSubscribeSection swScript="/sw-manage-push.js" scope="/manage/" />
      </div>
    </div>
  )
}
