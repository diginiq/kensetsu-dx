'use client'

import { useState } from 'react'
import { AlbumPhoto, AlbumLayout } from '@/lib/album/types'
import { PhotoSelectionStep } from '@/components/features/album/PhotoSelectionStep'
import { LayoutSelectionStep } from '@/components/features/album/LayoutSelectionStep'
import { PreviewStep } from '@/components/features/album/PreviewStep'
import { DownloadStep } from '@/components/features/album/DownloadStep'

interface Props {
  siteId: string;
  siteName: string;
}

export default function AlbumWizardClient({ siteId, siteName }: Props) {
  const [step, setStep] = useState<number>(1);
  const [selectedPhotos, setSelectedPhotos] = useState<AlbumPhoto[]>([]);
  const [layout, setLayout] = useState<AlbumLayout>('A4_PORTRAIT_2');

  return (
    <div className="space-y-6">
      {/* ステッパーナビゲーション */}
      <div className="flex items-center justify-between px-2 text-sm max-w-lg mx-auto">
        <div className={`font-bold ${step === 1 ? 'text-orange-600' : 'text-gray-400'}`}>1. 写真選択</div>
        <div className="flex-1 border-t-2 mx-2 border-gray-200"></div>
        <div className={`font-bold ${step === 2 ? 'text-orange-600' : 'text-gray-400'}`}>2. レイアウト</div>
        <div className="flex-1 border-t-2 mx-2 border-gray-200"></div>
        <div className={`font-bold ${step === 3 ? 'text-orange-600' : 'text-gray-400'}`}>3. プレビュー</div>
        <div className="flex-1 border-t-2 mx-2 border-gray-200"></div>
        <div className={`font-bold ${step === 4 ? 'text-orange-600' : 'text-gray-400'}`}>4. 出力</div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm min-h-[400px]">
        {step === 1 && (
          <PhotoSelectionStep
            siteId={siteId}
            selectedPhotos={selectedPhotos}
            onChange={setSelectedPhotos}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <LayoutSelectionStep
            layout={layout}
            onChange={setLayout}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}

        {step === 3 && (
          <PreviewStep
            siteName={siteName}
            layout={layout}
            selectedPhotos={selectedPhotos}
            onChange={setSelectedPhotos}
            onNext={() => setStep(4)}
            onBack={() => setStep(2)}
          />
        )}

        {step === 4 && (
          <DownloadStep
            siteId={siteId}
            layout={layout}
            selectedPhotos={selectedPhotos}
            onBack={() => setStep(3)}
          />
        )}
      </div>
    </div>
  )
}
