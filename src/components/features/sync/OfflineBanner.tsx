'use client'

import { useState, useEffect } from 'react'

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [show, setShow] = useState(false)

  useEffect(() => {
    setIsOnline(navigator.onLine)
    setShow(!navigator.onLine)

    const handleOnline = () => { setIsOnline(true); setShow(false) }
    const handleOffline = () => { setIsOnline(false); setShow(true) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (isOnline) return null

  return (
    <div className="bg-red-600 text-white text-center py-2 px-4 text-sm font-medium">
      📵 オフラインモード — 撮影した写真はオンライン復帰時に自動同期されます
    </div>
  )
}
