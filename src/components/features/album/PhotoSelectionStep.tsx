'use client'

import { useState, useEffect } from 'react'
import { AlbumPhoto, CaptionData } from '@/lib/album/types'
import { Folder, Image as ImageIcon, Check, Loader2, GripVertical, X } from 'lucide-react'

interface FolderNode {
  id: string
  name: string
  workTypeCode: string | null
  parentFolderId: string | null
  _count: { photos: number }
  children: FolderNode[]
}

interface PhotoApiResponse {
  id: string
  url: string
  thumbUrl: string
  fileName: string
  folderId: string | null
  takenAt: string
  boardData: any // Record<string, string> | null
  memo: string | null
}

interface Props {
  siteId: string
  selectedPhotos: AlbumPhoto[]
  onChange: (photos: AlbumPhoto[]) => void
  onNext: () => void
}

export function PhotoSelectionStep({ siteId, selectedPhotos, onChange, onNext }: Props) {
  const [folders, setFolders] = useState<FolderNode[]>([])
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  
  const [photos, setPhotos] = useState<PhotoApiResponse[]>([])
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingPhotos, setLoadingPhotos] = useState(false)

  // 1D配列にしてレンダリングしやすくするヘルパー
  const flattenFolders = (nodes: FolderNode[], depth = 0): { node: FolderNode; depth: number }[] => {
    let result: { node: FolderNode; depth: number }[] = []
    for (const node of nodes) {
      result.push({ node, depth })
      if (node.children && node.children.length > 0) {
        result = result.concat(flattenFolders(node.children, depth + 1))
      }
    }
    return result
  }

  useEffect(() => {
    const fetchFolders = async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}/folders`)
        if (res.ok) {
          const data = await res.json()
          setFolders(data)
        }
      } finally {
        setLoadingFolders(false)
      }
    }
    fetchFolders()
  }, [siteId])

  useEffect(() => {
    // フォルダが未選択なら「未分類」をロードする or 全てをロードする
    const fetchPhotos = async () => {
      setLoadingPhotos(true)
      try {
        const query = activeFolderId ? `?folderId=${activeFolderId}` : ''
        const res = await fetch(`/api/sites/${siteId}/photos${query}`)
        if (res.ok) {
          const data = await res.json()
          setPhotos(data)
        }
      } finally {
        setLoadingPhotos(false)
      }
    }
    fetchPhotos()
  }, [siteId, activeFolderId])

  const handleTogglePhoto = (p: PhotoApiResponse) => {
    const isSelected = selectedPhotos.some((s) => s.photoId === p.id)
    if (isSelected) {
      onChange(selectedPhotos.filter((s) => s.photoId !== p.id))
    } else {
      const d = p.takenAt ? new Date(p.takenAt) : new Date()
      // format YYYY-MM-DD
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      
      const bd = p.boardData || {}
      
      const newAlbumPhoto: AlbumPhoto = {
        photoId: p.id,
        url: p.url,
        thumbUrl: p.thumbUrl,
        caption: {
          photoNumber: `写真-${String(selectedPhotos.length + 1).padStart(3, '0')}`,
          workType: bd.workType || bd.workCategory || '',
          subType: bd.subType || '',
          date: dateStr,
          location: bd.location || '',
          memo: p.memo || '',
        }
      }
      onChange([...selectedPhotos, newAlbumPhoto])
    }
  }

  // ドラッグ＆ドロップ並び替え用
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  const handleDragStart = (index: number) => {
    setDragIndex(index)
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    if (dragIndex === null || dragIndex === index) return

    const newItems = [...selectedPhotos]
    const draggedItem = newItems[dragIndex]
    newItems.splice(dragIndex, 1)
    newItems.splice(index, 0, draggedItem)

    // 写真番号を再採番
    const renumbered = newItems.map((item, idx) => ({
      ...item,
      caption: {
        ...item.caption,
        photoNumber: `写真-${String(idx + 1).padStart(3, '0')}`
      }
    }))
    
    onChange(renumbered)
    setDragIndex(index)
  }

  const handleDragEnd = () => {
    setDragIndex(null)
  }

  const removeSelected = (id: string) => {
    const newItems = selectedPhotos.filter(p => p.photoId !== id)
    // 写真番号を再採番
    const renumbered = newItems.map((item, idx) => ({
      ...item,
      caption: {
        ...item.caption,
        photoNumber: `写真-${String(idx + 1).padStart(3, '0')}`
      }
    }))
    onChange(renumbered)
  }

  const flatFolders = flattenFolders(folders)

  return (
    <div className="flex flex-col h-full gap-6">
      <div className="flex justify-between items-center px-1">
        <div>
          <h2 className="text-xl font-bold">出力する写真を選択</h2>
          <p className="text-gray-500 text-sm mt-1">左側からフォルダを選び、追加したい写真をクリックしてください。</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full font-bold text-sm">
            {selectedPhotos.length} 枚選択中
          </span>
          <button
            onClick={onNext}
            disabled={selectedPhotos.length === 0}
            className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            次へ
          </button>
        </div>
      </div>

      <div className="flex gap-4 min-h-[400px]">
        {/* 左側：フォルダツリー */}
        <div className="w-64 bg-gray-50 border border-gray-200 rounded-lg p-3 overflow-y-auto max-h-[500px]">
          <h3 className="font-bold text-gray-700 mb-3 text-sm flex items-center gap-2">
            <Folder className="w-4 h-4" /> フォルダ一覧
          </h3>
          {loadingFolders ? (
            <div className="flex justify-center p-4"><Loader2 className="w-5 h-5 animate-spin text-gray-400" /></div>
          ) : (
            <div className="space-y-1">
              <button
                onClick={() => setActiveFolderId(null)}
                className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${activeFolderId === null ? 'bg-orange-100 text-orange-700 font-bold' : 'hover:bg-gray-200 text-gray-700'}`}
              >
                すべての写真
              </button>
              {flatFolders.map(({ node, depth }) => (
                <button
                  key={node.id}
                  onClick={() => setActiveFolderId(node.id)}
                  style={{ paddingLeft: `${depth * 1 + 0.5}rem` }}
                  className={`w-full text-left py-1.5 pr-2 rounded text-sm transition-colors flex justify-between items-center ${activeFolderId === node.id ? 'bg-orange-100 text-orange-700 font-bold' : 'hover:bg-gray-200 text-gray-700'}`}
                >
                  <span className="truncate">{node.name}</span>
                  <span className="text-xs text-gray-400 ml-2">{node._count.photos}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 右側：写真グリッド */}
        <div className="flex-1 bg-white border border-gray-200 rounded-lg p-4 overflow-y-auto max-h-[500px]">
          {loadingPhotos ? (
            <div className="flex justify-center items-center h-full"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
              <p>写真がありません</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {photos.map(p => {
                const isSelected = selectedPhotos.some(s => s.photoId === p.id)
                return (
                  <div
                    key={p.id}
                    onClick={() => handleTogglePhoto(p)}
                    className={`cursor-pointer group relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${isSelected ? 'border-orange-500 shadow-md' : 'border-transparent hover:border-gray-300'}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbUrl} alt="" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-orange-500 text-white p-1 rounded-full shadow">
                        <Check className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* 下部：選択済みサムネイルストリップ */}
      {selectedPhotos.length > 0 && (
        <div className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col gap-2">
          <div className="text-xs font-bold text-gray-500">選択中の写真（ドラッグ＆ドロップで並び替え）</div>
          <div className="flex overflow-x-auto gap-2 pb-2 h-28 items-center">
            {selectedPhotos.map((item, index) => (
              <div
                key={item.photoId}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className="relative shrink-0 w-24 h-24 rounded-lg bg-white border border-gray-300 overflow-hidden cursor-grab active:cursor-grabbing group hover:border-orange-500 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumbUrl} alt="" className="w-full h-full object-cover pointer-events-none" />
                <div className="absolute top-0 left-0 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded-br font-medium">
                  {index + 1}
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); removeSelected(item.photoId); }}
                  className="absolute top-1 right-1 bg-black/50 hover:bg-red-600 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-1 left-1 bg-white/80 p-0.5 rounded shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                  <GripVertical className="w-3 h-3 text-gray-600" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
