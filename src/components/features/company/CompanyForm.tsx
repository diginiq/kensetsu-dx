'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updateCompany } from '@/app/manage/company/actions'
import { Loader2 } from 'lucide-react'

interface Props {
  defaultValues: {
    name: string
    address: string | null
    phone: string | null
    constructionLicense: string | null
  }
}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full py-3 text-white font-bold rounded-lg text-base flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
      style={{ backgroundColor: '#E85D04' }}
    >
      {pending && <Loader2 className="w-4 h-4 animate-spin" />}
      保存する
    </button>
  )
}

export function CompanyForm({ defaultValues }: Props) {
  const [state, formAction] = useFormState(updateCompany, null)

  return (
    <form action={formAction} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          会社名 <span className="text-red-500">*</span>
        </label>
        <input
          name="name"
          required
          defaultValue={defaultValues.name}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">住所</label>
        <input
          name="address"
          defaultValue={defaultValues.address ?? ''}
          placeholder="東京都〇〇区..."
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">電話番号</label>
        <input
          name="phone"
          defaultValue={defaultValues.phone ?? ''}
          placeholder="03-0000-0000"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">建設業許可番号</label>
        <input
          name="constructionLicense"
          defaultValue={defaultValues.constructionLicense ?? ''}
          placeholder="国土交通大臣許可（特-〇〇）第〇〇号"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        />
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 font-medium bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-700 font-medium bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          会社情報を保存しました
        </p>
      )}

      <SubmitButton />
    </form>
  )
}
