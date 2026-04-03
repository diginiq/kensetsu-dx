import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { exportXmlSchema } from '@/lib/validations/album';
import { getPhotoBuffer } from '@/lib/storage';
import { buildPhotoXml } from '@/lib/album/xmlBuilder';
import archiver from 'archiver';

// For Vercel Edge/Serverless limits
export const maxDuration = 60;

type Params = {
  params: { siteId: string };
};

export async function POST(req: Request, { params }: Params) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    if (!session.user.companyId) return NextResponse.json({ error: '権限がありません' }, { status: 403 });

    const site = await prisma.site.findFirst({
      where: { id: params.siteId, companyId: session.user.companyId, status: { not: 'ARCHIVED' } },
      include: { company: true }
    });
    if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 });

    const body = await req.json();
    const result = exportXmlSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: '入力内容に誤りがあります', details: result.error.format() }, { status: 400 });
    }

    const { photos } = result.data;

    // 写真データを取得
    const photoIds = photos.map(p => p.photoId);
    const dbPhotos = await prisma.photo.findMany({
      where: { id: { in: photoIds }, siteId: params.siteId },
      select: { id: true, s3Key: true }
    });

    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Response stream API for archiver
    const transformStream = new TransformStream();
    const writer = transformStream.writable.getWriter();
    
    archive.on('data', chunk => {
      writer.write(chunk);
    });
    
    archive.on('end', () => {
      writer.close();
    });
    
    archive.on('error', err => {
      writer.abort(err);
    });

    // We can't await inside the event loop easily while writing to a TransformStream directly in Next.js App Router.
    // So we use an async IIFE to append all files and finalize the archive asynchronously.
    (async () => {
      try {
        for (const p of photos) {
          const dbPhoto = dbPhotos.find(dp => dp.id === p.photoId);
          if (!dbPhoto) continue;

          try {
            const buffer = await getPhotoBuffer(dbPhoto.s3Key);
            const folderName = p.caption.workType || '未分類';
            const fileName = `PHOTO/${folderName}/${p.photoId}.jpg`;
            archive.append(buffer, { name: fileName });
          } catch (e) {
            console.error(`Failed to load photo ${p.photoId}`, e);
          }
        }

        // PHOTO.XML を生成して追加
        const xmlContent = buildPhotoXml(site.name, site.company?.name || '', photos);
        archive.append(xmlContent, { name: 'PHOTO.XML' });

        await archive.finalize();
      } catch (e) {
        console.error('Archive build error', e);
        archive.abort();
      }
    })();

    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const encodedFilename = encodeURIComponent(`${site.name}_写真データ_${nowStr}.zip`);

    return new Response(transformStream.readable, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });

  } catch (error) {
    console.error('[ZIP_EXPORT_ERROR]', error);
    return NextResponse.json({ error: 'ZIPの生成中にエラーが発生しました' }, { status: 500 });
  }
}
