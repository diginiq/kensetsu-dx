import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = 'admin@ksdx.jp'
  const existing = await prisma.user.findUnique({ where: { email } })

  if (existing) {
    console.log('SUユーザーはすでに存在します:', email)
    return
  }

  const passwordHash = await bcrypt.hash('KsdxAdmin2026!', 12)

  await prisma.user.create({
    data: {
      email,
      name: 'システム管理者',
      passwordHash,
      role: 'SUPER_ADMIN',
      companyId: null,
    },
  })

  console.log('SUユーザーを作成しました:', email)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
