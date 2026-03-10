'use client'

import { useState } from 'react'
import Image from 'next/image'
import type { FolderNode } from './FolderTree'

interface Photo {
  id: string
  url: string
  thumbUrl: string
  s3Key: string
  fileName: string
  boardData: Record<string, string> | null
  memo: string | null
  folderId: string | null
  folder: { id: string; name: string } | null
  takenAt: string | null
  latitude: number | null
  longitude: number | null
}

interface PhotoDetailModalProps {
  photo: Photo
  siteId: string
  folders: FolderNode[]
  onClose: () => void
  onUpdate: (updated: Photo) => void
  onDelete: () => void
}

export function PhotoDetailModal({ photo, siteId, folders, onClose, onUpdate, onDelete }: PhotoDetailModalProps) {
  const [memo, setMemo] = useState(photo.memo ?? '')
  const [savingMemo, setSavingMemo] = useState(false)
  const [showFolderPicker, setShowFolderPicker] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleSaveMemo() {
    setSavingMemo(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/photos/${photo.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memo: memo || null }),
      })
      if (res.ok) {
        const updated = await res.json()
        onUpdate(updated)
      }
    } finally { setSavingMemo(false) }
  }

  async function handleFolderChange(folderId: string | null) {
    const res = await fetch(`/api/sites/${siteId}/photos/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ folderId }),
    })
    if (res.ok) {
      const updated = await res.json()
      onUpdate(updated)
    }
    setShowFolderPicker(false)
  }

  async function handleDelete() {
    if (!confirm('この写真を削除しますか？')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/sites/${siteId}/photos/${photo.id}`, { method: 'DELETE' })
      if (res.ok) onDelete()
    } finally { setDeleting(false) }
  }

  const bd = photo.boardData

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col overflow-hidden">
      {/* 閉じるボタン */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 pt-12 pb-3 z-10"
        style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.6) 0%, transparent 100%)' }}>
        <button onClick={onClose} className="w-10 h-10 bg-black/40 rounded-full flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-3 py-2 bg-red-500/80 rounded-full text-white text-sm font-medium disabled:opacity-50">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
          {deleting ? '削除中...' : '削除'}
        </button>
      </div>

      {/* 写真 */}
      <div className="relative flex-shrink-0 bg-black" style={{ height: '55vh' }}>
        <Image src={photo.url} alt="現場写真" fill className="object-contain" unoptimized />
      </div>

      {/* 情報パネル */}
      <div className="flex-1 bg-white overflow-y-auto pb-6">
        {/* 撮影日時 */}
        {photo.takenAt && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400">撮影日時</p>
            <p className="text-sm font-medium">{new Date(photo.takenAt).toLocaleString('ja-JP')}</p>
          </div>
        )}

        {/* フォルダ */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-1">フォルダ</p>
          <button
            onClick={() => setShowFolderPicker(true)}
            className="flex items-center gap-2 text-sm font-medium"
            style={{ color: '#E85D04' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            {photo.folder?.name ?? '未分類'}
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
          </button>
        </div>

        {/* 電子黒板データ */}
        {bd && (
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-xs text-gray-400 mb-2">電子黒板</p>
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              {Object.entries({
                工事名: bd.constructionName,
                工種: bd.workType ? `${bd.workCategory ?? ''} ${bd.workType}`.trim() : null,
                細別: bd.subType,
                測点: bd.location,
                施工者: bd.contractor,
                撮影日: bd.date,
              }).filter(([, v]) => v).map(([label, value]) => (
                <div key={label} className="flex text-sm border-b border-gray-200 last:border-0">
                  <span className="w-16 px-3 py-2 text-gray-500 bg-gray-100 shrink-0">{label}</span>
                  <span className="px-3 py-2 font-medium">{value}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* メモ */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 mb-2">メモ</p>
          <textarea
            value={memo}
            onChange={e => setMemo(e.target.value)}
            rows={3}
            placeholder="現場メモを入力..."
            className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button
            onClick={handleSaveMemo}
            disabled={savingMemo || memo === (photo.memo ?? '')}
            className="mt-2 w-full py-2.5 text-white text-sm font-bold rounded-xl disabled:opacity-40 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#E85D04' }}
          >
            {savingMemo ? '保存中...' : 'メモを保存'}
          </button>
        </div>
      </div>

      {/* フォルダ選択モーダル */}
      {showFolderPicker && (
        <div className="fixed inset-0 bg-black/50 z-60 flex items-end" onClick={() => setShowFolderPicker(false)}>
          <div className="bg-white w-full rounded-t-2xl max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200">
              <h3 className="font-bold text-base">フォルダを選択</h3>
            </div>
            <div className="p-3 space-y-1">
              <button onClick={() => handleFolderChange(null)} className="w-full text-left px-3 py-3 rounded-xl hover:bg-gray-50 text-sm text-gray-500">
                未分類（フォルダなし）
              </button>
              {folders.map(f => (
                <FolderOption key={f.id} folder={f} depth={0} onSelect={handleFolderChange} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function FolderOption({ folder, depth, onSelect }: { folder: FolderNode; depth: number; onSelect: (id: string) => void }) {
  return (
    <>
      <button
        onClick={() => onSelect(folder.id)}
        className="w-full text-left px-3 py-3 rounded-xl hover:bg-orange-50 text-sm font-medium"
        style={{ paddingLeft: `${12 + depth * 20}px` }}
      >
        📁 {folder.name}
        <span className="ml-2 text-xs text-gray-400">{folder._count.photos}枚</span>
      </button>
      {folder.children.map(c => (
        <FolderOption key={c.id} folder={c} depth={depth + 1} onSelect={onSelect} />
      ))}
    </>
  )
}
