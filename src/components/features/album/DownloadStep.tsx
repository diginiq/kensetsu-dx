'use client';

import { useState } from 'react';
import { AlbumPhoto, AlbumLayout } from '@/lib/album/types';
import { Loader2, Download, FileArchive } from 'lucide-react';

interface Props {
  siteId: string;
  layout: AlbumLayout;
  selectedPhotos: AlbumPhoto[];
  onBack: () => void;
}

export function DownloadStep({ siteId, layout, selectedPhotos, onBack }: Props) {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [errorLine, setErrorLine] = useState('');

  const generateAndDownload = async (url: string, bodyObj: any, defaultFilename: string, setter: (b: boolean) => void) => {
    setter(true);
    setErrorLine('');
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyObj),
      });

      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }

      const contentDisposition = res.headers.get('Content-Disposition');
      let filename = defaultFilename;
      if (contentDisposition) {
        const match = contentDisposition.match(/filename\*=UTF-8''(.+)/);
        if (match && match[1]) {
          filename = decodeURIComponent(match[1]);
        }
      }

      const blob = await res.blob();
      const objUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(objUrl);
    } catch (err: any) {
      console.error(err);
      setErrorLine(`ダウンロードに失敗しました: ${err.message}`);
    } finally {
      setter(false);
    }
  };

  const handleDownloadPdf = () => {
    generateAndDownload(
      `/api/sites/${siteId}/album/generate`,
      { layout, photos: selectedPhotos },
      'album.pdf',
      setIsGeneratingPdf
    );
  };

  const handleDownloadZip = () => {
    generateAndDownload(
      `/api/sites/${siteId}/album/export`,
      { photos: selectedPhotos },
      'album.zip',
      setIsGeneratingZip
    );
  };

  return (
    <div className="flex flex-col h-full items-center justify-center p-8">
      <h2 className="text-2xl font-bold mb-2">準備が完了しました🎉</h2>
      <p className="text-gray-500 mb-10">写真台帳と指定形式のZIPデータを出力できます。</p>

      {errorLine && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded border border-red-200 w-full max-w-md text-sm font-medium">
          {errorLine}
        </div>
      )}

      <div className="flex flex-col gap-4 max-w-md w-full mx-auto">
        <button
          onClick={handleDownloadPdf}
          disabled={isGeneratingPdf || isGeneratingZip}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl text-center shadow-md transition-all flex justify-center items-center gap-2 text-lg disabled:opacity-50"
        >
          {isGeneratingPdf ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
          {isGeneratingPdf ? 'PDF生成中...' : 'PDFをダウンロード'}
        </button>

        <button
          onClick={handleDownloadZip}
          disabled={isGeneratingPdf || isGeneratingZip}
          className="w-full bg-white border-2 border-orange-600 hover:bg-orange-50 text-orange-600 font-bold py-4 rounded-xl text-center shadow-sm transition-all flex justify-center items-center gap-2 text-lg disabled:opacity-50"
        >
          {isGeneratingZip ? <Loader2 className="w-6 h-6 animate-spin" /> : <FileArchive className="w-6 h-6" />}
          {isGeneratingZip ? 'ZIP生成中...' : '国交省基準 ZIPデータ出力'}
        </button>
      </div>

      <div className="mt-12">
        <button onClick={onBack} disabled={isGeneratingPdf || isGeneratingZip} className="text-gray-500 hover:text-gray-800 font-bold underline disabled:opacity-50">
          プレビューへ戻る
        </button>
      </div>
    </div>
  );
}
