'use client'

import { useEffect, useState } from 'react'
import { X, ImageIcon, Loader2 } from 'lucide-react'

type PhotoItem = {
  id: string
  siteName: string
  fileName: string
  thumbUrl: string
  url: string
}

interface Props {
  open: boolean
  onClose: () => void
  conversationId: string
  onAttached: (msg: {
    id: string
    body: string
    senderId: string
    senderName: string
    createdAt: string
    fileUrl: string | null
    fileAccessUrl: string | null
    fileName: string | null
    fileType: string | null
  }) => void
}

export function MessagePhotoPicker({ open, onClose, conversationId, onAttached }: Props) {
  const [photos, setPhotos] = useState<PhotoItem[]>([])
  const [loading, setLoading] = useState(false)
  const [attaching, setAttaching] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setError('')
    fetch('/api/messages/company-photos?limit=48')
      .then((r) => r.json())
      .then((data) => {
        setPhotos(data.photos ?? [])
        if (!data.photos?.length && data.error) setError(data.error)
      })
      .catch(() => setError('読み込みに失敗しました'))
      .finally(() => setLoading(false))
  }, [open])

  async function attach(photoId: string) {
    setAttaching(photoId)
    setError('')
    try {
      const res = await fetch(`/api/messages/${conversationId}/attach-photo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoId }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError((d as { error?: string }).error ?? '添付に失敗しました')
        return
      }
      const msg = await res.json()
      onAttached({
        id: msg.id,
        body: msg.body,
        senderId: msg.sender.id,
        senderName: msg.sender.name,
        createdAt: msg.createdAt,
        fileUrl: msg.fileUrl,
        fileAccessUrl: msg.fileAccessUrl ?? null,
        fileName: msg.fileName,
        fileType: msg.fileType,
      })
      onClose()
    } catch {
      setError('通信エラーが発生しました')
    }
    setAttaching(null)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full max-w-screen-sm max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <ImageIcon size={20} className="text-gray-600" />
            <p className="font-bold text-gray-800">現場写真から添付</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-touch min-w-touch flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100"
            aria-label="閉じる"
          >
            <X size={22} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-3">
          {error && <p className="text-sm text-red-600 mb-2 px-1">{error}</p>}
          {loading ? (
            <div className="flex justify-center py-12 text-gray-500">
              <Loader2 className="animate-spin" size={28} />
            </div>
          ) : photos.length === 0 ? (
            <p className="text-center text-gray-500 py-10 text-sm">表示できる写真がありません</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={!!attaching}
                  onClick={() => attach(p.id)}
                  className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 bg-gray-100 disabled:opacity-50"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.thumbUrl || p.url} alt="" className="w-full h-full object-cover" />
                  {attaching === p.id && (
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" size={24} />
                    </div>
                  )}
                  <span className="absolute bottom-0 left-0 right-0 bg-black/55 text-white text-[10px] px-1 py-0.5 truncate">
                    {p.siteName}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
