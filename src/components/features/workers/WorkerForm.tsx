'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createWorker } from '@/app/manage/workers/actions'
import { Loader2 } from 'lucide-react'

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-6 py-2 text-white font-bold rounded-lg text-sm flex items-center gap-2 disabled:opacity-60 transition-opacity"
      style={{ backgroundColor: '#E85D04' }}
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      登録する
    </button>
  )
}

export function WorkerForm() {
  const [state, formAction] = useFormState(createWorker, null)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <h2 className="font-bold text-gray-700 mb-4">新規従業員登録</h2>
      <form action={formAction} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">氏名 *</label>
          <input
            name="name"
            required
            placeholder="山田 太郎"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">メールアドレス *</label>
          <input
            name="email"
            type="email"
            required
            placeholder="worker@example.co.jp"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">電話番号</label>
          <input
            name="phone"
            placeholder="090-0000-0000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">パスワード *</label>
          <input
            name="password"
            type="password"
            required
            placeholder="8文字以上"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
          />
        </div>

        {state?.error && (
          <div className="sm:col-span-2 text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {state.error}
          </div>
        )}

        <div className="sm:col-span-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}
