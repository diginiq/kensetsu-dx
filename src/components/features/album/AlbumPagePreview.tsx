'use client'

import React from 'react'
import { AlbumPhoto, AlbumLayout } from '@/lib/album/types'

interface Props {
  layout: AlbumLayout
  siteName: string
  pageNumber: number
  totalPages: number
  photos: AlbumPhoto[]
}

/** 
 * A4用紙比率（1 : 1.414）でのプレビューコンポーネント。
 * PDF (@react-pdf/renderer) のレイアウトに似せたHTML表現。
 */
export function AlbumPagePreview({ layout, siteName, pageNumber, totalPages, photos }: Props) {
  // レイアウトによってアスペクト比と向きが変わる
  const isLandscape = layout === 'A4_LANDSCAPE_1'
  const aspectRatio = isLandscape ? '1.414 / 1' : '1 / 1.414'
  
  return (
    <div 
      className="bg-white border shadow-md flex flex-col mx-auto"
      style={{
        aspectRatio,
        width: '100%',
        maxHeight: '100%',
        padding: '3%', // 余白
        fontSize: '0.85rem' // 縮小表示用
      }}
    >
      {/* ヘッダー */}
      <div className="flex justify-between items-end border-b-2 border-black pb-1 mb-4 select-none">
        <div className="font-bold text-lg">{siteName}</div>
        <div className="text-sm">施工者/発注者</div>
      </div>

      {/* メインのグリッド部分 */}
      <div className="flex-1 flex flex-col gap-4">
        {layout === 'A4_PORTRAIT_2' && (
          <div className="flex-1 flex flex-col gap-4">
            {photos.map((p, i) => (
              <div key={p.photoId} className="flex-1 flex gap-4 border border-gray-400 p-2 relative h-1/2">
                <div className="w-1/2 h-full bg-gray-100 flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.url || p.thumbUrl} className="max-w-full max-h-full object-contain pointer-events-none" alt=""/>
                </div>
                <div className="w-1/2 flex flex-col pt-1">
                  <div className="font-bold text-base mb-2 select-all">{p.caption.photoNumber}</div>
                  <dl className="grid grid-cols-[3.5rem_1fr] gap-x-2 gap-y-1.5 text-sm">
                    <dt className="text-gray-500">工種:</dt>
                    <dd className="col-span-1 border-b border-gray-200 min-h-[1.5rem] break-all">{p.caption.workType} {p.caption.subType ? `> ${p.caption.subType}` : ''}</dd>
                    
                    <dt className="text-gray-500">箇所:</dt>
                    <dd className="col-span-1 border-b border-gray-200 min-h-[1.5rem] break-all">{p.caption.location}</dd>
                    
                    <dt className="text-gray-500">撮影日:</dt>
                    <dd className="col-span-1 border-b border-gray-200 min-h-[1.5rem]">{p.caption.date}</dd>
                    
                    <dt className="text-gray-500 mt-1">メモ:</dt>
                    <dd className="col-span-1 min-h-[1.5rem] whitespace-pre-wrap mt-1 break-words leading-tight">{p.caption.memo}</dd>
                  </dl>
                </div>
              </div>
            ))}
          </div>
        )}

        {layout === 'A4_PORTRAIT_4' && (
           <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-2">
            {photos.map((p, i) => (
              <div key={p.photoId} className="border border-gray-400 p-1 flex flex-col w-full h-full relative">
                <div className="h-4/6 bg-gray-100 flex items-center justify-center overflow-hidden mb-1">
                   {/* eslint-disable-next-line @next/next/no-img-element */}
                   <img src={p.url || p.thumbUrl} className="max-w-full max-h-full object-contain pointer-events-none" alt="" />
                </div>
                <div className="h-2/6 flex flex-col text-[0.65rem] justify-start content-start">
                  <div className="font-bold">{p.caption.photoNumber}</div>
                  <div className="truncate text-gray-700">工種: {p.caption.workType}</div>
                  <div className="truncate text-gray-700">箇所: {p.caption.location}</div>
                </div>
              </div>
            ))}
           </div>
        )}

        {layout === 'A4_LANDSCAPE_1' && (
          <div className="flex-1 flex gap-4 h-full p-2">
             <div className="w-2/3 h-full bg-gray-100 flex items-center justify-center overflow-hidden border border-gray-300">
               {/* eslint-disable-next-line @next/next/no-img-element */}
               <img src={photos[0]?.url || photos[0]?.thumbUrl} className="max-w-full max-h-full object-contain pointer-events-none" alt="" />
             </div>
             <div className="w-1/3 flex flex-col pl-4 pt-4 border-l-2 border-gray-200">
                <div className="font-bold text-xl mb-4 select-all">{photos[0]?.caption.photoNumber}</div>
                <dl className="grid grid-cols-[4rem_1fr] gap-x-2 gap-y-3 text-base">
                  <dt className="text-gray-500 font-medium">工種:</dt>
                  <dd className="border-b border-gray-300 min-h-[2rem] break-all pb-1">{photos[0]?.caption.workType}</dd>
                  
                  <dt className="text-gray-500 font-medium">箇所:</dt>
                  <dd className="border-b border-gray-300 min-h-[2rem] break-all pb-1">{photos[0]?.caption.location}</dd>
                  
                  <dt className="text-gray-500 font-medium">撮影日:</dt>
                  <dd className="border-b border-gray-300 min-h-[2rem] pb-1">{photos[0]?.caption.date}</dd>
                  
                  <dt className="text-gray-500 font-medium pt-2">メモ:</dt>
                  <dd className="whitespace-pre-wrap pt-2 leading-relaxed break-words">{photos[0]?.caption.memo}</dd>
                </dl>
             </div>
          </div>
        )}
      </div>

      {/* フッター */}
      <div className="text-center mt-3 pt-2 text-xs select-none">
        - {pageNumber} / {totalPages} -
      </div>
    </div>
  )
}
