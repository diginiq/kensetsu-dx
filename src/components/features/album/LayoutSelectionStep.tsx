'use client'

import { AlbumLayout } from '@/lib/album/types'

interface Props {
  layout: AlbumLayout
  onChange: (l: AlbumLayout) => void
  onNext: () => void
  onBack: () => void
}

export function LayoutSelectionStep({ layout, onChange, onNext, onBack }: Props) {
  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-bold">レイアウトの選択</h2>
          <p className="text-gray-500 text-sm mt-1">印刷時またはPDF出力時の写真サイズ・配置を選んでください。</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <label className={`block p-6 border-2 rounded-xl cursor-pointer transition-colors relative ${layout === 'A4_PORTRAIT_2' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
          <input type="radio" value="A4_PORTRAIT_2" checked={layout === 'A4_PORTRAIT_2'} onChange={() => onChange('A4_PORTRAIT_2')} className="sr-only"/>
          {layout === 'A4_PORTRAIT_2' && <div className="absolute top-4 right-4 w-4 h-4 bg-orange-500 rounded-full border-4 border-white shadow-sm"></div>}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-32 bg-white border shadow-sm p-2 flex flex-col gap-2 rounded">
              <div className="w-full flex-1 bg-gray-200 rounded"></div>
              <div className="w-full flex-1 bg-gray-200 rounded"></div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-800">2枚 / ページ</div>
              <div className="text-xs text-gray-500 mt-1">写真が大きく見やすい</div>
              <div className="text-xs font-medium text-gray-400 mt-1">A4 縦レイアウト</div>
            </div>
          </div>
        </label>

        <label className={`block p-6 border-2 rounded-xl cursor-pointer transition-colors relative ${layout === 'A4_PORTRAIT_4' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
          <input type="radio" value="A4_PORTRAIT_4" checked={layout === 'A4_PORTRAIT_4'} onChange={() => onChange('A4_PORTRAIT_4')} className="sr-only"/>
          {layout === 'A4_PORTRAIT_4' && <div className="absolute top-4 right-4 w-4 h-4 bg-orange-500 rounded-full border-4 border-white shadow-sm"></div>}
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-32 bg-white border shadow-sm p-2 grid grid-cols-2 grid-rows-2 gap-1 rounded">
              <div className="bg-gray-200 rounded"></div>
              <div className="bg-gray-200 rounded"></div>
              <div className="bg-gray-200 rounded"></div>
              <div className="bg-gray-200 rounded"></div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-800">4枚 / ページ</div>
              <div className="text-xs text-gray-500 mt-1">コンパクトにまとまる</div>
              <div className="text-xs font-medium text-gray-400 mt-1">A4 縦レイアウト</div>
            </div>
          </div>
        </label>

        <label className={`block p-6 border-2 rounded-xl cursor-pointer transition-colors relative ${layout === 'A4_LANDSCAPE_1' ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
          <input type="radio" value="A4_LANDSCAPE_1" checked={layout === 'A4_LANDSCAPE_1'} onChange={() => onChange('A4_LANDSCAPE_1')} className="sr-only"/>
          {layout === 'A4_LANDSCAPE_1' && <div className="absolute top-4 right-4 w-4 h-4 bg-orange-500 rounded-full border-4 border-white shadow-sm"></div>}
          <div className="flex flex-col items-center gap-4">
            <div className="w-32 h-24 bg-white border shadow-sm p-2 flex rounded mt-4 mb-4">
              <div className="w-full h-full bg-gray-200 rounded"></div>
            </div>
            <div className="text-center">
              <div className="font-bold text-gray-800">1枚 / ページ</div>
              <div className="text-xs text-gray-500 mt-1">大判プリント用</div>
              <div className="text-xs font-medium text-gray-400 mt-1">A4 横レイアウト</div>
            </div>
          </div>
        </label>
      </div>

      <div className="mt-8 flex justify-between">
        <button onClick={onBack} className="px-6 py-2 border rounded-lg hover:bg-gray-50 font-bold text-gray-700">
          戻る
        </button>
        <button onClick={onNext} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold">
          プレビューへ進む
        </button>
      </div>
    </div>
  )
}
