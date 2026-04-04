import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { LogoutButton } from '@/components/features/auth/LogoutButton'
import { PushSubscribeSection } from '@/components/features/push/PushSubscribeSection'
import { ChangePasswordForm } from '@/components/features/auth/ChangePasswordForm'
import { WorkerSelfProfileForm } from '@/components/features/auth/WorkerSelfProfileForm'
import { LanguageSelector } from '@/components/features/settings/LanguageSelector'
import { LineConnect } from '@/components/features/settings/LineConnect'

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
      language: true,
      lineUserId: true,
      company: { select: { name: true } },
      workerProfile: {
        select: {
          address: true,
          bloodType: true,
          emergencyName: true,
          emergencyPhone: true,
          emergencyRelation: true,
          healthInsuranceType: true,
          healthInsuranceNo: true,
          pensionType: true,
          pensionNo: true,
          employmentInsuranceNo: true,
          specialMedicalCheck: true,
          lastMedicalCheckDate: true,
        },
      },
    },
  })

  if (!user) redirect('/login')

  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: 'アドミニストレーター',
    COMPANY_ADMIN: 'マネージャー',
    SITE_SUPERVISOR: '現場監督',
    FOREMAN: '職長',
    WORKER: '作業員',
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

        {/* プロフィール編集 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-3">プロフィール編集</h2>
          <WorkerSelfProfileForm
            defaultValues={{
              phone: user.phone,
              address: user.workerProfile?.address ?? null,
              emergencyName: user.workerProfile?.emergencyName ?? null,
              emergencyPhone: user.workerProfile?.emergencyPhone ?? null,
              emergencyRelation: user.workerProfile?.emergencyRelation ?? null,
              bloodType: user.workerProfile?.bloodType ?? null,
              healthInsuranceType: user.workerProfile?.healthInsuranceType ?? null,
              healthInsuranceNo: user.workerProfile?.healthInsuranceNo ?? null,
              pensionType: user.workerProfile?.pensionType ?? null,
              pensionNo: user.workerProfile?.pensionNo ?? null,
              employmentInsuranceNo: user.workerProfile?.employmentInsuranceNo ?? null,
              specialMedicalCheck: user.workerProfile?.specialMedicalCheck ?? false,
              lastMedicalCheckDate: user.workerProfile?.lastMedicalCheckDate
                ? new Date(user.workerProfile.lastMedicalCheckDate).toISOString().split('T')[0]
                : null,
            }}
          />
        </div>

        <Link
          href="/app/qualifications"
          className="block bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:border-orange-300 transition-colors"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-700">保有資格・免許</h2>
            <span className="text-gray-400 text-sm">→</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">資格の有効期限を確認できます</p>
        </Link>

        {/* 言語設定 */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-1">表示言語</h2>
          <p className="text-xs text-gray-400 mb-3">Display Language / Ngôn ngữ hiển thị</p>
          <LanguageSelector currentLanguage={user.language ?? 'ja'} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-3">LINE通知連携</h2>
          <LineConnect lineUserId={user.lineUserId ?? null} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-3">プッシュ通知</h2>
          <PushSubscribeSection swScript="/sw-app-push.js" scope="/app/" />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="font-bold text-gray-700 mb-3">パスワード変更</h2>
          <ChangePasswordForm />
        </div>

        <div className="pt-4">
          <LogoutButton />
        </div>
      </main>
    </div>
  )
}
