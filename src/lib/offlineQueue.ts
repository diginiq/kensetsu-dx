/**
 * オフライン音声録音キュー（IndexedDB）
 * 電波のない現場で録音→後でアップロード
 */

const DB_NAME = 'kensetsu-dx-offline'
const DB_VERSION = 1
const STORE_NAME = 'audio-queue'

export interface OfflineAudioItem {
  id: string
  audioBlob: Blob
  mimeType: string
  siteId: string
  siteName: string
  reportDate: string // YYYY-MM-DD
  reportType: 'WORK_DIARY' | 'SITE_JOURNAL'
  recordedAt: number // timestamp
  status: 'pending' | 'uploading' | 'done' | 'error'
  errorMsg?: string
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('status', 'status', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/** キューに追加 */
export async function enqueueAudio(
  audioBlob: Blob,
  mimeType: string,
  siteId: string,
  siteName: string,
  reportDate: string,
  reportType: 'WORK_DIARY' | 'SITE_JOURNAL',
): Promise<string> {
  const db = await openDB()
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  const item: OfflineAudioItem = {
    id,
    audioBlob,
    mimeType,
    siteId,
    siteName,
    reportDate,
    reportType,
    recordedAt: Date.now(),
    status: 'pending',
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).add(item)
    req.onsuccess = () => resolve(id)
    req.onerror = () => reject(req.error)
  })
}

/** 全キューアイテム取得 */
export async function getAllQueued(): Promise<OfflineAudioItem[]> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const req = tx.objectStore(STORE_NAME).getAll()
    req.onsuccess = () => resolve(req.result as OfflineAudioItem[])
    req.onerror = () => reject(req.error)
  })
}

/** ステータス更新 */
export async function updateQueueStatus(
  id: string,
  status: OfflineAudioItem['status'],
  errorMsg?: string,
): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const getReq = store.get(id)
    getReq.onsuccess = () => {
      const item = getReq.result as OfflineAudioItem
      if (!item) { resolve(); return }
      const putReq = store.put({ ...item, status, errorMsg })
      putReq.onsuccess = () => resolve()
      putReq.onerror = () => reject(putReq.error)
    }
    getReq.onerror = () => reject(getReq.error)
  })
}

/** 完了アイテムを削除 */
export async function removeQueueItem(id: string): Promise<void> {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const req = tx.objectStore(STORE_NAME).delete(id)
    req.onsuccess = () => resolve()
    req.onerror = () => reject(req.error)
  })
}

/** pending件数 */
export async function getPendingCount(): Promise<number> {
  const items = await getAllQueued()
  return items.filter((i) => i.status === 'pending' || i.status === 'error').length
}
