'use client'

import { useState } from 'react'
import { LANG_OPTIONS, type Lang } from '@/lib/i18n'

interface Props {
  currentLanguage: string
}

export function LanguageSelector({ currentLanguage }: Props) {
  const [lang, setLang] = useState<Lang>((currentLanguage as Lang) || 'ja')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const handleChange = async (newLang: Lang) => {
    setLang(newLang)
    setSaving(true)
    await fetch('/api/user/language', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ language: newLang }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {LANG_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            onClick={() => handleChange(opt.value)}
            className={`py-3 rounded-xl border-2 text-sm font-medium transition-all ${
              lang === opt.value
                ? 'border-orange-400 bg-orange-50 text-orange-700'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
            }`}
          >
            <span className="block text-xl mb-1">{opt.flag}</span>
            {opt.label}
          </button>
        ))}
      </div>
      {saving && <p className="text-xs text-gray-400">保存中...</p>}
      {saved && <p className="text-xs text-green-600">✓ 言語設定を保存しました</p>}
    </div>
  )
}
