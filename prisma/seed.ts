import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // ─── SUユーザー ───────────────────────────────────────────
  const suEmail = 'admin@ksdx.jp'
  const suExists = await prisma.user.findUnique({ where: { email: suEmail } })
  if (!suExists) {
    const hash = await bcrypt.hash('KsdxAdmin2026!', 12)
    await prisma.user.create({
      data: { email: suEmail, name: 'アドミニストレーター', passwordHash: hash, role: 'SUPER_ADMIN', companyId: null },
    })
    console.log('✓ SUユーザー作成:', suEmail)
  } else {
    console.log('- SUユーザーは既存:', suEmail)
  }

  const pw = await bcrypt.hash('password123', 12)

  // ─── 会社1: 新潟建設株式会社 ────────────────────────────────
  const company1Email = 'tanaka@niigata-kensetsu.co.jp'
  if (await prisma.user.findUnique({ where: { email: company1Email } })) {
    console.log('- 会社1は既存: スキップ')
  } else {
    const c1 = await prisma.company.create({
      data: {
        name: '新潟建設株式会社',
        address: '新潟県新潟市中央区万代1-1-1',
        phone: '025-111-2222',
        constructionLicense: '新潟県知事許可（般-5）第12345号',
        plan: 'STANDARD',
        status: 'ACTIVE',
      },
    })

    const [c1admin, c1w1, c1w2, c1w3] = await Promise.all([
      prisma.user.create({ data: { email: company1Email, name: '田中太郎', passwordHash: pw, role: 'COMPANY_ADMIN', companyId: c1.id } }),
      prisma.user.create({ data: { email: 'sato@niigata-kensetsu.co.jp', name: '佐藤一郎', passwordHash: pw, role: 'WORKER', companyId: c1.id } }),
      prisma.user.create({ data: { email: 'suzuki@niigata-kensetsu.co.jp', name: '鈴木次郎', passwordHash: pw, role: 'WORKER', companyId: c1.id } }),
      prisma.user.create({ data: { email: 'takahashi@niigata-kensetsu.co.jp', name: '高橋三郎', passwordHash: pw, role: 'WORKER', companyId: c1.id } }),
    ])
    console.log('✓ 会社1作成:', c1.name, '/ ユーザー4名')

    // 現場1-1: 道路改良工事（土木）
    const s1 = await prisma.site.create({
      data: {
        name: '県道○○線道路改良工事',
        clientName: '新潟県土木部',
        clientType: 'PREFECTURE',
        status: 'ACTIVE',
        startDate: new Date('2026-04-01'),
        endDate: new Date('2027-03-31'),
        contractAmount: 45000000,
        companyId: c1.id,
        assignments: { create: [{ userId: c1w1.id }, { userId: c1w2.id }] },
      },
    })
    await prisma.photoFolder.createMany({
      data: [
        { name: '土工', siteId: s1.id, sortOrder: 1 },
        { name: '基礎工', siteId: s1.id, sortOrder: 2 },
        { name: 'コンクリート工', siteId: s1.id, sortOrder: 3 },
        { name: '舗装工', siteId: s1.id, sortOrder: 4 },
      ],
    })

    // 現場1-2: 体育館改修工事（建築）
    const s2 = await prisma.site.create({
      data: {
        name: '市立△△小学校体育館改修工事',
        clientName: '新潟市教育委員会',
        clientType: 'MUNICIPAL',
        status: 'ACTIVE',
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-12-31'),
        contractAmount: 28000000,
        companyId: c1.id,
        assignments: { create: [{ userId: c1w2.id }, { userId: c1w3.id }] },
      },
    })
    await prisma.photoFolder.createMany({
      data: [
        { name: '躯体工事', siteId: s2.id, sortOrder: 1 },
        { name: '外装工事', siteId: s2.id, sortOrder: 2 },
        { name: '内装工事', siteId: s2.id, sortOrder: 3 },
        { name: '設備工事', siteId: s2.id, sortOrder: 4 },
      ],
    })

    // 現場1-3: 河川護岸工事（土木）
    const s3 = await prisma.site.create({
      data: {
        name: '□□川河川護岸工事',
        clientName: '北陸地方整備局',
        clientType: 'NATIONAL',
        status: 'PLANNING',
        startDate: new Date('2026-10-01'),
        endDate: new Date('2027-09-30'),
        contractAmount: 120000000,
        companyId: c1.id,
        assignments: { create: [{ userId: c1w1.id }] },
      },
    })
    await prisma.photoFolder.createMany({
      data: [
        { name: '土工', siteId: s3.id, sortOrder: 1 },
        { name: '基礎工', siteId: s3.id, sortOrder: 2 },
        { name: 'コンクリート工', siteId: s3.id, sortOrder: 3 },
        { name: '舗装工', siteId: s3.id, sortOrder: 4 },
      ],
    })
    console.log('✓ 会社1の現場3件作成')
  }

  // ─── 会社2: 越後土木工業有限会社 ────────────────────────────
  const company2Email = 'yamada@echigo-doboku.co.jp'
  if (await prisma.user.findUnique({ where: { email: company2Email } })) {
    console.log('- 会社2は既存: スキップ')
  } else {
    const c2 = await prisma.company.create({
      data: {
        name: '越後土木工業有限会社',
        address: '新潟県長岡市大手通1-2-3',
        phone: '0258-333-4444',
        constructionLicense: '新潟県知事許可（般-5）第67890号',
        plan: 'FREE',  // LIGHTプランはスキーマ未定義のためFREEで代替
        status: 'ACTIVE',
      },
    })

    const [, c2w1, c2w2] = await Promise.all([
      prisma.user.create({ data: { email: company2Email, name: '山田花子', passwordHash: pw, role: 'COMPANY_ADMIN', companyId: c2.id } }),
      prisma.user.create({ data: { email: 'watanabe@echigo-doboku.co.jp', name: '渡辺健太', passwordHash: pw, role: 'WORKER', companyId: c2.id } }),
      prisma.user.create({ data: { email: 'ito@echigo-doboku.co.jp', name: '伊藤美咲', passwordHash: pw, role: 'WORKER', companyId: c2.id } }),
    ])
    console.log('✓ 会社2作成:', c2.name, '/ ユーザー3名')

    // 現場2-1: 舗装工事（土木）
    const s4 = await prisma.site.create({
      data: {
        name: '市道○○号線舗装工事',
        clientName: '長岡市建設部',
        clientType: 'MUNICIPAL',
        status: 'ACTIVE',
        startDate: new Date('2026-05-01'),
        endDate: new Date('2026-11-30'),
        contractAmount: 15000000,
        companyId: c2.id,
        assignments: { create: [{ userId: c2w1.id }, { userId: c2w2.id }] },
      },
    })
    await prisma.photoFolder.createMany({
      data: [
        { name: '土工', siteId: s4.id, sortOrder: 1 },
        { name: '基礎工', siteId: s4.id, sortOrder: 2 },
        { name: 'コンクリート工', siteId: s4.id, sortOrder: 3 },
        { name: '舗装工', siteId: s4.id, sortOrder: 4 },
      ],
    })

    // 現場2-2: 公園整備工事（土木）
    const s5 = await prisma.site.create({
      data: {
        name: '△△公園整備工事',
        clientName: '長岡市都市整備部',
        clientType: 'MUNICIPAL',
        status: 'ACTIVE',
        startDate: new Date('2026-07-01'),
        endDate: new Date('2027-01-31'),
        contractAmount: 22000000,
        companyId: c2.id,
        assignments: { create: [{ userId: c2w1.id }] },
      },
    })
    await prisma.photoFolder.createMany({
      data: [
        { name: '土工', siteId: s5.id, sortOrder: 1 },
        { name: '基礎工', siteId: s5.id, sortOrder: 2 },
        { name: 'コンクリート工', siteId: s5.id, sortOrder: 3 },
        { name: '舗装工', siteId: s5.id, sortOrder: 4 },
      ],
    })
    console.log('✓ 会社2の現場2件作成')
  }

  // ─── 会社3: 上越ハウジング株式会社 ──────────────────────────
  const company3Email = 'kobayashi@joetsu-housing.co.jp'
  if (await prisma.user.findUnique({ where: { email: company3Email } })) {
    console.log('- 会社3は既存: スキップ')
  } else {
    const c3 = await prisma.company.create({
      data: {
        name: '上越ハウジング株式会社',
        address: '新潟県上越市春日山町1-5-10',
        phone: '025-555-6666',
        constructionLicense: '新潟県知事許可（般-5）第11111号',
        plan: 'FREE',
        status: 'TRIAL',
      },
    })

    const [, c3w1] = await Promise.all([
      prisma.user.create({ data: { email: company3Email, name: '小林誠', passwordHash: pw, role: 'COMPANY_ADMIN', companyId: c3.id } }),
      prisma.user.create({ data: { email: 'kato@joetsu-housing.co.jp', name: '加藤裕子', passwordHash: pw, role: 'WORKER', companyId: c3.id } }),
    ])
    console.log('✓ 会社3作成:', c3.name, '/ ユーザー2名')

    // 現場3-1: 個人住宅新築（住宅）
    const s6 = await prisma.site.create({
      data: {
        name: '個人住宅新築工事（山田邸）',
        clientName: '山田太郎',
        clientType: 'PRIVATE',
        status: 'ACTIVE',
        startDate: new Date('2026-08-01'),
        endDate: new Date('2027-02-28'),
        contractAmount: 35000000,
        companyId: c3.id,
        assignments: { create: [{ userId: c3w1.id }] },
      },
    })
    await prisma.photoFolder.createMany({
      data: [
        { name: '基礎工事', siteId: s6.id, sortOrder: 1 },
        { name: '木工事', siteId: s6.id, sortOrder: 2 },
        { name: '屋根工事', siteId: s6.id, sortOrder: 3 },
        { name: '内装工事', siteId: s6.id, sortOrder: 4 },
        { name: '外構工事', siteId: s6.id, sortOrder: 5 },
      ],
    })
    console.log('✓ 会社3の現場1件作成')
  }

  console.log('\n=== シード完了 ===')
  console.log('アドミニストレーター: admin@ksdx.jp / KsdxAdmin2026!')
  console.log('会社1マネージャー: tanaka@niigata-kensetsu.co.jp / password123')
  console.log('会社2マネージャー: yamada@echigo-doboku.co.jp / password123')
  console.log('会社3マネージャー: kobayashi@joetsu-housing.co.jp / password123')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
