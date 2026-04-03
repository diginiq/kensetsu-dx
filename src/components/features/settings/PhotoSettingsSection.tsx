'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface PhotoSettings {
  resolution: '1024' | '2048' | '4096'
  jpegQuality: number
  storageLimitGb: number
  autoOrganize: boolean
}

export function PhotoSettingsSection() {
  const [settings, setSettings] = useState<PhotoSettings>({
    resolution: '2048',
    jpegQuality: 85,
    storageLimitGb: 10,
    autoOrganize: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/photo-settings')
      .then((r) => r.json())
      .then((d) => { setSettings(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/photo-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || `HTTP ${res.status}`)
      }
      setMessage({ type: 'success', text: '設定を保存しました' })
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message })
    } finally {
      setSaving(false)
    }
  }

  const resolutionOptions = [
    { value: '1024', label: '1024px（軽量・低画質）' },
    { value: '2048', label: '2048px（標準・推奨）' },
    { value: '4096', label: '4096px（高画質・容量大）' },
  ]

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <h2 className="font-bold text-gray-800">写真設定</h2>

      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              保存解像度（長辺の上限）
            </label>
            <select
              value={settings.resolution}
              onChange={(e) => setSettings({ ...settings, resolution: e.target.value as PhotoSettings['resolution'] })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {resolutionOptions.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              JPEG品質: {settings.jpegQuality}%
            </label>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={settings.jpegQuality}
              onChange={(e) => setSettings({ ...settings, jpegQuality: Number(e.target.value) })}
              className="w-full accent-orange-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>50%（軽量）</span>
              <span>100%（高品質）</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ストレージ上限（GB）
            </label>
            <input
              type="number"
              min={1}
              max={1000}
              value={settings.storageLimitGb}
              onChange={(e) => setSettings({ ...settings, storageLimitGb: Number(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              role="switch"
              aria-checked={settings.autoOrganize}
              onClick={() => setSettings({ ...settings, autoOrganize: !settings.autoOrganize })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${settings.autoOrganize ? 'bg-orange-600' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.autoOrganize ? 'translate-x-6' : 'translate-x-1'}`}
              />
            </button>
            <span className="text-sm text-gray-700">
              工種ごとに自動でフォルダ整理する
            </span>
          </div>

          {message && (
            <p className={`text-sm font-medium ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
              {message.text}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 text-white font-bold rounded-lg text-base flex items-center justify-center gap-2 disabled:opacity-50 transition-opacity"
            style={{ backgroundColor: '#E85D04' }}
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            保存する
          </button>
        </>
      )}
    </div>
  )
}
