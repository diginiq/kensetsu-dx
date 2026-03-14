'use client'

import type { ToastItem } from '@/hooks/useToast'

export function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  if (toasts.length === 0) return null
  return (
    <div className="fixed top-4 left-0 right-0 z-[60] flex flex-col items-center gap-2 px-4 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`w-full max-w-sm rounded-xl px-4 py-3 text-sm font-medium text-white shadow-lg ${
            t.type === 'success'
              ? 'bg-green-700'
              : t.type === 'error'
                ? 'bg-red-600'
                : 'bg-gray-800'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
