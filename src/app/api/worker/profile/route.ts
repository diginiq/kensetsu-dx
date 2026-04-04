import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { z } from 'zod'

const schema = z.object({
  phone: z.string().max(20).nullable().optional(),
  address: z.string().max(200).nullable().optional(),
  emergencyName: z.string().max(50).nullable().optional(),
  emergencyPhone: z.string().max(20).nullable().optional(),
  emergencyRelation: z.string().max(30).nullable().optional(),
  bloodType: z.enum(['A', 'B', 'O', 'AB']).nullable().optional(),
  healthInsuranceType: z.string().max(30).nullable().optional(),
  healthInsuranceNo: z.string().max(50).nullable().optional(),
  pensionType: z.string().max(30).nullable().optional(),
  pensionNo: z.string().max(50).nullable().optional(),
  employmentInsuranceNo: z.string().max(50).nullable().optional(),
  specialMedicalCheck: z.boolean().optional(),
  lastMedicalCheckDate: z.string().nullable().optional(),
})

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const body = await req.json()
  const result = schema.safeParse(body)
  if (!result.success) {
    return NextResponse.json({ error: '入力が不正です' }, { status: 400 })
  }

  const {
    phone, address, emergencyName, emergencyPhone, emergencyRelation, bloodType,
    healthInsuranceType, healthInsuranceNo, pensionType, pensionNo,
    employmentInsuranceNo, specialMedicalCheck, lastMedicalCheckDate,
  } = result.data

  if (phone !== undefined) {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { phone: phone ?? null },
    })
  }

  const profileData = {
    ...(address !== undefined && { address }),
    ...(emergencyName !== undefined && { emergencyName }),
    ...(emergencyPhone !== undefined && { emergencyPhone }),
    ...(emergencyRelation !== undefined && { emergencyRelation }),
    ...(bloodType !== undefined && { bloodType }),
    ...(healthInsuranceType !== undefined && { healthInsuranceType }),
    ...(healthInsuranceNo !== undefined && { healthInsuranceNo }),
    ...(pensionType !== undefined && { pensionType }),
    ...(pensionNo !== undefined && { pensionNo }),
    ...(employmentInsuranceNo !== undefined && { employmentInsuranceNo }),
    ...(specialMedicalCheck !== undefined && { specialMedicalCheck }),
    ...(lastMedicalCheckDate !== undefined && {
      lastMedicalCheckDate: lastMedicalCheckDate ? new Date(lastMedicalCheckDate) : null,
    }),
  }

  await prisma.workerProfile.upsert({
    where: { userId: session.user.id },
    create: { userId: session.user.id, ...profileData },
    update: profileData,
  })

  return NextResponse.json({ ok: true })
}
