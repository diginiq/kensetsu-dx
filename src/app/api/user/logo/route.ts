import { getServerSession } from 'next-auth'
import { NextRequest, NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { uploadFile } from '@/lib/storage'
import { writeAuditLog } from '@/lib/audit'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'COMPANY_ADMIN' || !session.user.companyId) {
    return NextResponse.json({ error: '権限がありません' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'ファイルが必要です' }, { status: 400 })

  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: 'JPG/PNG/WebP/SVGのみアップロード可能です' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const ext = file.type === 'image/svg+xml' ? 'svg' : file.type.split('/')[1]
  const s3Key = `logos/${session.user.companyId}/logo.${ext}`

  await uploadFile(buffer, s3Key, file.type)

  // URL取得
  const { getPhotoUrl } = await import('@/lib/storage')
  const logoUrl = getPhotoUrl(s3Key)

  await prisma.company.update({
    where: { id: session.user.companyId },
    data: { logoUrl },
  })

  writeAuditLog({
    companyId: session.user.companyId,
    userId: session.user.id,
    action: 'UPLOAD_LOGO',
    target: 'Company',
    targetId: session.user.companyId,
  })

  return NextResponse.json({ logoUrl })
}
