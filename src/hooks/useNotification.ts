'use client'

import { useEffect, useState, useCallback } from 'react'

export function useNotification() {
  const [permission, setPermission] = useState<NotificationPermission>('default')

  useEffect(() => {
    if (typeof Notification !== 'undefined') {
      setPermission(Notification.permission)
    }
  }, [])

  const requestPermission = useCallback(async () => {
    if (typeof Notification === 'undefined') return 'denied' as NotificationPermission
    const p = await Notification.requestPermission()
    setPermission(p)
    return p
  }, [])

  const showNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    if (document.visibilityState === 'visible') return
    new Notification(title, {
      icon: '/logo.png',
      badge: '/logo.png',
      ...options,
    })
  }, [])

  return { permission, requestPermission, showNotification }
}
