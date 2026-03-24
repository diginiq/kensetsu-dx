import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LogoutButton } from '@/components/features/auth/LogoutButton'

export default async function SettingsPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      role: true,
      company: { select: { name: true } },
      workerProfile: {
        select: {
          address: true,
          bloodType: true,
          emergencyName: true,
          emergencyPhone: true,
          emergencyRelation: true,
        },
      },
    },
  })

  if (!user) redirect('/login')

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'アドミニストレーター',
    COMPANY_ADMIN: 'マネージャー',
    WORKER: 'ワーカー',
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto">
          <p className="font-bold">設定</p>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-5 space-y-4">
        {/* プロフィール */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center gap-4 mb-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center text-white text-xl font-bold"
              style={{ backgroundColor: '#E85D04' }}
            >
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-lg text-gray-800">{user.name}</p>
              <p className="text-sm text-gray-500">{roleLabel[user.role] ?? user.role}</p>
            </div>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">メールアドレス</span>
              <span className="text-gray-800">{user.email}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">電話番号</span>
              <span className="text-gray-800">{user.phone ?? '未登録'}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-gray-100">
              <span className="text-gray-500">所属会社</span>
              <span className="text-gray-800">{user.company?.name ?? '-'}</span>
            </div>
          </div>
        </div>

        {/* 緊急連絡先 */}
        {user.workerProfile && (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-bold text-gray-700 mb-3">緊急連絡先</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">氏名</span>
                <span className="text-gray-800">{user.workerProfile.emergencyName ?? '未登録'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">電話番号</span>
                <span className="text-gray-800">{user.workerProfile.emergencyPhone ?? '未登録'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">続柄</span>
                <span className="text-gray-800">{user.workerProfile.emergencyRelation ?? '未登録'}</span>
              </div>
              <div className="flex justify-between py-2 border-b border-gray-100">
                <span className="text-gray-500">血液型</span>
                <span className="text-gray-800">{user.workerProfile.bloodType ? `${user.workerProfile.bloodType}型` : '未登録'}</span>
              </div>
            </div>
          </div>
        )}

        {/* ログアウト */}
        <div className="pt-4">
          <LogoutButton />
        </div>
      </main>
    </div>
  )
}
