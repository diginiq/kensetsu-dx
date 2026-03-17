import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { ManageNav } from '@/components/manage/ManageNav'

export default async function ManageLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN') {
    redirect('/login')
  }

  const company = session.user.companyId
    ? await prisma.company.findUnique({
        where: { id: session.user.companyId },
        select: { name: true },
      })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <ManageNav companyName={company?.name ?? '会社名未設定'} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  )
}
