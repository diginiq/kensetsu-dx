import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { generateAlbumSchema } from '@/lib/validations/album';
import { getPhotoBuffer } from '@/lib/storage';
import { renderToStream } from '@react-pdf/renderer';
import { AlbumDocument, PdfPhoto } from '@/lib/pdf/albumDocument';
import React from 'react';

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
    });
    if (!site) return NextResponse.json({ error: '現場が見つかりません' }, { status: 404 });

    const body = await req.json();
    const result = generateAlbumSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: '入力内容に誤りがあります', details: result.error.format() }, { status: 400 });
    }

    const { layout, photos } = result.data;

    // 写真データをDBから取得して S3キーを特定
    const photoIds = photos.map(p => p.photoId);
    const dbPhotos = await prisma.photo.findMany({
      where: { id: { in: photoIds }, siteId: params.siteId },
      select: { id: true, s3Key: true }
    });

    // 選択された順番にそってバッファを取得（並列リクエストで高速化）
    const pdfPhotos: PdfPhoto[] = await Promise.all(
      photos.map(async (p) => {
        const dbPhoto = dbPhotos.find(dp => dp.id === p.photoId);
        if (!dbPhoto) throw new Error(`写真が見つかりません: ${p.photoId}`);

        const imageBuffer = await getPhotoBuffer(dbPhoto.s3Key);
        return {
          photoNumber: p.caption.photoNumber,
          workType: `${p.caption.workType}${p.caption.subType ? ` > ${p.caption.subType}` : ''}`,
          location: p.caption.location,
          date: p.caption.date,
          memo: p.caption.memo,
          imageBuffer,
        };
      })
    );

    // レイアウトに応じてページ単位に分割
    const photosPerPage = layout === 'A4_PORTRAIT_2' ? 2 : layout === 'A4_PORTRAIT_4' ? 4 : 1;
    const pages: PdfPhoto[][] = [];
    for (let i = 0; i < pdfPhotos.length; i += photosPerPage) {
      pages.push(pdfPhotos.slice(i, i + photosPerPage));
    }

    // PDFストリームを生成
    const pdfStream = await renderToStream(React.createElement(AlbumDocument, { siteName: site.name, layout, pages }) as any);

    // ResponseをWeb Streams APIに変換するためのヘルパー処理
    const webStream = new ReadableStream({
      start(controller) {
        pdfStream.on('data', chunk => controller.enqueue(chunk));
        pdfStream.on('end', () => controller.close());
        pdfStream.on('error', err => controller.error(err));
      }
    });

    const nowStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const encodedFilename = encodeURIComponent(`${site.name}_写真台帳_${nowStr}.pdf`);

    return new Response(webStream, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodedFilename}`,
      },
    });
  } catch (error) {
    console.error('[PDF_GENERATE_ERROR]', error);
    return NextResponse.json({ error: 'PDFの生成中にエラーが発生しました' }, { status: 500 });
  }
}
