import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(_req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  const workers = await prisma.user.findMany({
    where: { companyId: session.user.companyId, role: 'WORKER' },
    select: {
      name: true,
      email: true,
      phone: true,
      isActive: true,
      createdAt: true,
      workerProfile: {
        select: {
          address: true,
          bloodType: true,
          emergencyName: true,
          emergencyPhone: true,
          healthInsuranceType: true,
          pensionType: true,
          lastMedicalCheckDate: true,
        },
      },
      workerQualifications: { select: { id: true } },
    },
    orderBy: { name: 'asc' },
  })

  const headers = [
    '氏名', 'メールアドレス', '電話番号', 'ステータス', '住所', '血液型',
    '緊急連絡先氏名', '緊急連絡先電話', '健康保険種別', '年金種別',
    '最終健康診断日', '資格件数', '登録日',
  ]

  const rows = workers.map((w) => [
    w.name,
    w.email,
    w.phone ?? '',
    w.isActive ? '有効' : '無効',
    w.workerProfile?.address ?? '',
    w.workerProfile?.bloodType ?? '',
    w.workerProfile?.emergencyName ?? '',
    w.workerProfile?.emergencyPhone ?? '',
    w.workerProfile?.healthInsuranceType ?? '',
    w.workerProfile?.pensionType ?? '',
    w.workerProfile?.lastMedicalCheckDate
      ? new Date(w.workerProfile.lastMedicalCheckDate).toLocaleDateString('ja-JP')
      : '',
    String(w.workerQualifications.length),
    new Date(w.createdAt).toLocaleDateString('ja-JP'),
  ])

  const csv = [headers, ...rows]
    .map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(','))
    .join('\n')
  const bom = '\uFEFF'
  const filename = encodeURIComponent('従業員一覧.csv')

  return new Response(bom + csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
    },
  })
}
