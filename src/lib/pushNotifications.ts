import webpush from 'web-push'
import { prisma } from '@/lib/db'

export function isWebPushConfigured(): boolean {
  return !!(
    process.env.VAPID_PUBLIC_KEY &&
    process.env.VAPID_PRIVATE_KEY &&
    process.env.VAPID_SUBJECT
  )
}

let vapidReady = false

function ensureVapid(): void {
  if (vapidReady || !isWebPushConfigured()) return
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  )
  vapidReady = true
}

export async function sendWebPushToUser(
  userId: string,
  payload: { title: string; body: string; url: string },
): Promise<void> {
  if (!isWebPushConfigured()) return
  ensureVapid()
  const subs = await prisma.pushSubscription.findMany({ where: { userId } })
  const body = JSON.stringify(payload)
  for (const s of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        body,
      )
    } catch (e: unknown) {
      const status = (e as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) {
        await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {})
      }
    }
  }
}
