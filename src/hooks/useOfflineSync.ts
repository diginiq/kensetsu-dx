'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { get, set, del, keys, createStore } from 'idb-keyval'

// IndexedDB store for offline photos
const offlineStore = createStore('kensetsu-dx-offline', 'pending-photos')

export interface PendingPhoto {
  id: string
  siteId: string
  imageBlob: Blob
  thumbBlob: Blob | null
  boardData: Record<string, string> | null
  lat: number | null
  lng: number | null
  takenAt: string
  retryCount: number
  createdAt: number
}

export interface SyncState {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  syncedCount: number
  failedCount: number
  lastSyncAt: Date | null
}

export function useOfflineSync() {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    syncedCount: 0,
    failedCount: 0,
    lastSyncAt: null,
  })
  const syncingRef = useRef(false)

  // Count pending photos
  const refreshPendingCount = useCallback(async () => {
    try {
      const allKeys = await keys(offlineStore)
      setSyncState(prev => ({ ...prev, pendingCount: allKeys.length }))
    } catch {
      // ignore
    }
  }, [])

  // Save photo to IndexedDB for offline
  const saveOfflinePhoto = useCallback(async (
    siteId: string,
    imageBlob: Blob,
    thumbBlob: Blob | null,
    boardData: Record<string, string> | null,
    lat: number | null,
    lng: number | null,
    takenAt: string,
  ): Promise<string> => {
    const id = `offline_${Date.now()}_${Math.random().toString(36).slice(2)}`
    const pending: PendingPhoto = {
      id,
      siteId,
      imageBlob,
      thumbBlob,
      boardData,
      lat,
      lng,
      takenAt,
      retryCount: 0,
      createdAt: Date.now(),
    }
    await set(id, pending, offlineStore)
    await refreshPendingCount()
    return id
  }, [refreshPendingCount])

  // Upload a single pending photo
  const uploadPendingPhoto = useCallback(async (photo: PendingPhoto): Promise<boolean> => {
    const MAX_RETRIES = 3
    if (photo.retryCount >= MAX_RETRIES) return false

    try {
      const formData = new FormData()
      formData.append('image', photo.imageBlob, 'photo.jpg')
      if (photo.boardData) formData.append('boardData', JSON.stringify(photo.boardData))
      if (photo.lat != null) formData.append('lat', String(photo.lat))
      if (photo.lng != null) formData.append('lng', String(photo.lng))
      formData.append('takenAt', photo.takenAt)

      const res = await fetch(`/api/sites/${photo.siteId}/photos`, {
        method: 'POST',
        body: formData,
      })

      if (res.ok) {
        await del(photo.id, offlineStore)
        return true
      }

      // Update retry count
      await set(photo.id, { ...photo, retryCount: photo.retryCount + 1 }, offlineStore)
      return false
    } catch {
      await set(photo.id, { ...photo, retryCount: photo.retryCount + 1 }, offlineStore)
      return false
    }
  }, [])

  // Sync all pending photos
  const syncPendingPhotos = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return
    syncingRef.current = true
    setSyncState(prev => ({ ...prev, isSyncing: true }))

    try {
      const allKeys = await keys(offlineStore)
      if (allKeys.length === 0) {
        setSyncState(prev => ({ ...prev, isSyncing: false, lastSyncAt: new Date() }))
        return
      }

      let synced = 0
      let failed = 0

      for (const key of allKeys) {
        const photo = await get<PendingPhoto>(key as string, offlineStore)
        if (!photo) continue

        const success = await uploadPendingPhoto(photo)
        if (success) {
          synced++
        } else {
          failed++
        }

        // Update count as we go
        const remaining = await keys(offlineStore)
        setSyncState(prev => ({
          ...prev,
          pendingCount: remaining.length,
          syncedCount: prev.syncedCount + (success ? 1 : 0),
          failedCount: failed,
        }))
      }

      setSyncState(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
      }))
    } catch {
      setSyncState(prev => ({ ...prev, isSyncing: false }))
    } finally {
      syncingRef.current = false
    }
  }, [uploadPendingPhoto])

  // Get all pending photos for display
  const getPendingPhotos = useCallback(async (): Promise<PendingPhoto[]> => {
    try {
      const allKeys = await keys(offlineStore)
      const photos = await Promise.all(
        allKeys.map(k => get<PendingPhoto>(k as string, offlineStore))
      )
      return photos.filter((p): p is PendingPhoto => p != null)
        .sort((a, b) => a.createdAt - b.createdAt)
    } catch {
      return []
    }
  }, [])

  // Delete a pending photo
  const deletePendingPhoto = useCallback(async (id: string) => {
    await del(id, offlineStore)
    await refreshPendingCount()
  }, [refreshPendingCount])

  // Online/offline event handling
  useEffect(() => {
    const handleOnline = () => {
      setSyncState(prev => ({ ...prev, isOnline: true }))
      // Auto-sync when coming back online
      setTimeout(() => syncPendingPhotos(), 1000)
    }
    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }))
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial count
    refreshPendingCount()

    // Sync on load if online
    if (navigator.onLine) {
      syncPendingPhotos()
    }

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [syncPendingPhotos, refreshPendingCount])

  return {
    syncState,
    saveOfflinePhoto,
    syncPendingPhotos,
    getPendingPhotos,
    deletePendingPhoto,
    refreshPendingCount,
  }
}
