'use client'

import { useState } from 'react'
import Image from 'next/image'
import bcrypt from 'bcryptjs'

interface AlbumInfo {
  id: string
  title: string
  description: string | null
  siteName: string
  hasPassword: boolean
  passwordHash: string | null
  createdAt: string
}

interface PhotoItem {
  id: string
  url: string
  fileName: string
  memo: string | null
  folderName: string | null
  takenAt: string
}

interface Props {
  album: AlbumInfo
  photos: PhotoItem[]
}

export function SharedAlbumViewer({ album, photos }: Props) {
  const [unlocked, setUnlocked] = useState(!album.hasPassword)
  const [password, setPassword] = useState('')
  const [pwError, setPwError] = useState('')
  const [selected, setSelected] = useState<PhotoItem | null>(null)

  const handleUnlock = async () => {
    if (!album.passwordHash) return
    const ok = await bcrypt.compare(password, album.passwordHash)
    if (ok) {
      setUnlocked(true)
    } else {
      setPwError('パスワードが違います')
    }
  }

  // パスワード画面
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 max-w-sm w-full">
          <div className="text-center mb-6">
            <div className="text-4xl mb-2">🔒</div>
            <h1 className="text-xl font-bold text-gray-800">{album.title}</h1>
            <p className="text-sm text-gray-500 mt-1">{album.siteName}</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPwError('') }}
              onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
              placeholder="パスワードを入力"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            {pwError && <p className="text-sm text-red-600">{pwError}</p>}
            <button
              onClick={handleUnlock}
              className="w-full py-3 text-white font-bold rounded-xl"
              style={{ backgroundColor: '#E85D04' }}
            >
              アルバムを見る
            </button>
          </div>
        </div>
      </div>
    )
  }

  // アルバム表示
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-xl font-bold text-gray-800">{album.title}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{album.siteName} ・ {photos.length}枚</p>
          {album.description && (
            <p className="text-sm text-gray-600 mt-2">{album.description}</p>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {photos.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-4xl mb-2">📷</p>
            <p>写真がありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {photos.map((photo) => (
              <button
                key={photo.id}
                onClick={() => setSelected(photo)}
                className="aspect-square relative bg-gray-100 rounded-lg overflow-hidden group hover:ring-2 hover:ring-orange-400 transition-all"
              >
                <Image
                  src={photo.url}
                  alt={photo.memo ?? photo.fileName}
                  fill
                  sizes="200px"
                  className="object-cover"
                  unoptimized
                />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* 写真モーダル */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative max-w-2xl w-full mx-4 bg-white rounded-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-video bg-black">
              <Image
                src={selected.url}
                alt={selected.memo ?? selected.fileName}
                fill
                className="object-contain"
                unoptimized
              />
            </div>
            <div className="p-4">
              {selected.folderName && (
                <p className="text-xs text-gray-500">{selected.folderName}</p>
              )}
              {selected.memo && (
                <p className="text-sm text-gray-700 mt-1">{selected.memo}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(selected.takenAt).toLocaleString('ja-JP', {
                  year: 'numeric', month: 'long', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <footer className="text-center py-8 text-xs text-gray-400">
        Powered by 建設DX
      </footer>
    </div>
  )
}
