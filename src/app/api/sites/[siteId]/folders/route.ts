import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'

type Params = { params: { siteId: string } }

interface FolderNode {
  id: string
  name: string
  workTypeCode: string | null
  parentFolderId: string | null
  sortOrder: number
  _count: { photos: number }
  children: FolderNode[]
}

function buildTree(folders: Omit<FolderNode, 'children'>[]): FolderNode[] {
  const map = new Map<string, FolderNode>()
  folders.forEach(f => map.set(f.id, { ...f, children: [] }))
  const roots: FolderNode[] = []
  map.forEach(f => {
    if (f.parentFolderId && map.has(f.parentFolderId)) {
      map.get(f.parentFolderId)!.children.push(f)
    } else {
      roots.push(f)
    }
  })
  return roots
}

export async function GET(_req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const site = await prisma.site.findFirst({ where: { id: params.siteId, companyId: session.user.companyId } })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const folders = await prisma.photoFolder.findMany({
    where: { siteId: params.siteId },
    include: { _count: { select: { photos: true } } },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  })

  return NextResponse.json(buildTree(folders))
}

export async function POST(req: Request, { params }: Params) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 })

  const site = await prisma.site.findFirst({ where: { id: params.siteId, companyId: session.user.companyId } })
  if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 })

  const { name, workTypeCode, parentFolderId } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'フォルダ名を入力してください' }, { status: 400 })

  const folder = await prisma.photoFolder.create({
    data: { name: name.trim(), workTypeCode: workTypeCode || null, parentFolderId: parentFolderId || null, siteId: params.siteId },
    include: { _count: { select: { photos: true } } },
  })

  return NextResponse.json({ ...folder, children: [] }, { status: 201 })
}
