'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'

interface Props {
  currentLogoUrl: string | null
}

export function LogoUpload({ currentLogoUrl }: Props) {
  const router = useRouter()
  const [preview, setPreview] = useState<string | null>(currentLogoUrl)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    if (!allowed.includes(file.type)) {
      setError('JPG/PNG/WebP/SVGのみアップロード可能です')
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('ファイルサイズは2MB以下にしてください')
      return
    }
    setError('')
    // プレビュー
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/user/logo', { method: 'POST', body: formData })
    setUploading(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? 'アップロードに失敗しました')
    } else {
      router.refresh()
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        {preview ? (
          <div className="relative w-20 h-20 rounded-xl border border-gray-200 overflow-hidden bg-gray-50">
            <Image src={preview} alt="会社ロゴ" fill className="object-contain p-2" unoptimized />
          </div>
        ) : (
          <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
            <span className="text-gray-300 text-3xl">🏢</span>
          </div>
        )}
        <div className="space-y-1.5">
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50"
            style={{ backgroundColor: '#455A64' }}
          >
            {uploading ? 'アップロード中...' : 'ロゴを変更'}
          </button>
          <p className="text-xs text-gray-400">JPG/PNG/WebP/SVG・2MB以下</p>
        </div>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
