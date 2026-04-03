import { getServerSession } from 'next-auth';
import { redirect, notFound } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import AlbumWizardClient from './AlbumWizardClient';

export const metadata = {
  title: '写真台帳の作成 - 建設DX',
};

interface Props {
  params: { siteId: string };
}

export default async function AlbumPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');
  if (!session.user.companyId) redirect('/login');

  const site = await prisma.site.findFirst({
    where: {
      id: params.siteId,
      companyId: session.user.companyId,
      status: { not: 'ARCHIVED' },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!site) notFound();

  return (
    <div className="min-h-screen bg-background">
      {/* 画面全体のヘッダー */}
      <header className="bg-primary-500 text-white px-4 py-3 safe-top">
        <div className="max-w-screen-md mx-auto">
          <h1 className="font-bold text-base truncate">写真台帳の作成: {site.name}</h1>
        </div>
      </header>

      {/* メインのウィザードコンポーネント */}
      <main className="max-w-screen-md mx-auto w-full p-4">
        <AlbumWizardClient siteId={site.id} siteName={site.name} />
      </main>
    </div>
  );
}
