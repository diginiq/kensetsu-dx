'use client'

import { useState } from 'react'
import { AlbumPhoto, AlbumLayout } from '@/lib/album/types'
import { AlbumPagePreview } from './AlbumPagePreview'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface Props {
  siteName: string
  layout: AlbumLayout
  selectedPhotos: AlbumPhoto[]
  onChange: (p: AlbumPhoto[]) => void
  onNext: () => void
  onBack: () => void
}

export function PreviewStep({ siteName, layout, selectedPhotos, onChange, onNext, onBack }: Props) {
  const [currentPage, setCurrentPage] = useState(1)

  const photosPerPage = layout === 'A4_PORTRAIT_2' ? 2 : layout === 'A4_PORTRAIT_4' ? 4 : 1
  const totalPages = Math.max(1, Math.ceil(selectedPhotos.length / photosPerPage))

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  const startIndex = (currentPage - 1) * photosPerPage
  const currentPhotos = selectedPhotos.slice(startIndex, startIndex + photosPerPage)

  const updateCaption = (photoId: string, field: keyof AlbumPhoto['caption'], value: string) => {
    const newPhotos = selectedPhotos.map((p) => {
      if (p.photoId === photoId) {
        return {
          ...p,
          caption: {
            ...p.caption,
            [field]: value,
          },
        }
      }
      return p
    })
    onChange(newPhotos)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-bold">プレビューとキャプション編集</h2>
          <p className="text-gray-500 text-sm mt-1">印刷時のイメージを確認しながら、写真の情報を編集できます。</p>
        </div>
      </div>

      {/* メインの左右ペイン構成 */}
      <div className="flex flex-col md:flex-row gap-6 h-full mt-2">
        {/* 左ペイン：プレビュー */}
        <div className="w-full md:w-1/2 flex flex-col items-center bg-gray-100 border border-gray-200 rounded-lg p-4">
          <div className="flex justify-between items-center w-full mb-4">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30 transition-colors"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <span className="font-bold text-gray-700">
              {currentPage} / {totalPages} ページ
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="p-2 rounded-full hover:bg-gray-200 disabled:opacity-30 transition-colors"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="w-full max-w-[400px]">
            <AlbumPagePreview
              layout={layout}
              siteName={siteName}
              pageNumber={currentPage}
              totalPages={totalPages}
              photos={currentPhotos}
            />
          </div>
        </div>

        {/* 右ペイン：キャプション編集フォーム */}
        <div className="w-full md:w-1/2 flex flex-col gap-4 overflow-y-auto max-h-[600px] pr-2">
          {currentPhotos.length === 0 ? (
            <div className="text-gray-500 text-center py-10 border border-dashed rounded bg-gray-50">
              このページには写真がありません
            </div>
          ) : (
            currentPhotos.map((p, index) => (
              <div key={p.photoId} className="bg-white border shadow-sm rounded-lg p-4">
                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbUrl} alt="" className="w-20 h-20 object-cover rounded shadow-sm border" />
                  <div className="flex-1 flex flex-col justify-center">
                    <label className="text-xs font-bold text-gray-500 mb-1">写真番号</label>
                    <input
                      type="text"
                      className="border rounded px-2 py-1 text-sm w-full font-bold focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                      value={p.caption.photoNumber}
                      onChange={(e) => updateCaption(p.photoId, 'photoNumber', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-4">
                  <div className="flex flex-col">
                     <label className="text-xs font-bold text-gray-500 mb-1">工種</label>
                     <input
                       type="text"
                       className="border rounded px-2 py-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                       value={p.caption.workType}
                       onChange={(e) => updateCaption(p.photoId, 'workType', e.target.value)}
                     />
                  </div>
                  <div className="flex flex-col">
                     <label className="text-xs font-bold text-gray-500 mb-1">細別 (任意)</label>
                     <input
                       type="text"
                       className="border rounded px-2 py-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                       value={p.caption.subType || ''}
                       onChange={(e) => updateCaption(p.photoId, 'subType', e.target.value)}
                     />
                  </div>
                  <div className="flex flex-col">
                     <label className="text-xs font-bold text-gray-500 mb-1">撮影箇所</label>
                     <input
                       type="text"
                       className="border rounded px-2 py-1.5 text-sm focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none"
                       value={p.caption.location}
                       onChange={(e) => updateCaption(p.photoId, 'location', e.target.value)}
                     />
                  </div>
                  <div className="flex flex-col">
                     <label className="text-xs font-bold text-gray-500 mb-1">撮影日 (読取専用)</label>
                     <input
                       type="text"
                       readOnly
                       className="border rounded px-2 py-1.5 text-sm bg-gray-100 text-gray-600 outline-none"
                       value={p.caption.date}
                     />
                  </div>
                  <div className="flex flex-col col-span-2">
                     <label className="text-xs font-bold text-gray-500 mb-1">メモ・備考</label>
                     <textarea
                       className="border rounded px-2 py-1.5 text-sm h-20 resize-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none leading-tight"
                       value={p.caption.memo}
                       onChange={(e) => updateCaption(p.photoId, 'memo', e.target.value)}
                     />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-4 flex justify-between border-t border-gray-200 pt-4">
        <button onClick={onBack} className="px-6 py-2 border rounded-lg hover:bg-gray-50 font-bold text-gray-700">
          戻る
        </button>
        <button onClick={onNext} className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold">
          出力へ進む
        </button>
      </div>
    </div>
  )
}
