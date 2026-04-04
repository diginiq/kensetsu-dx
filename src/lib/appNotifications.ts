import { prisma } from '@/lib/db'
import { sendWebPushToUser } from '@/lib/pushNotifications'
import { sendLineMessage, sendLineMulticast } from '@/lib/line'

/** アプリ内通知を保存 + プッシュ通知 + LINE送信 */
export async function notifyUser(
  userId: string,
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  const [_, user] = await Promise.all([
    prisma.appNotification.create({
      data: { userId, title: payload.title, body: payload.body, url: payload.url },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: { lineUserId: true } }),
  ])

  sendWebPushToUser(userId, {
    title: payload.title,
    body: payload.body,
    url: payload.url ?? '/',
  }).catch(() => {})

  if (user?.lineUserId) {
    sendLineMessage(user.lineUserId, `${payload.title}\n${payload.body}`).catch(() => {})
  }
}

/** 複数ユーザーへの一括通知 */
export async function notifyUsers(
  userIds: string[],
  payload: { title: string; body: string; url?: string },
): Promise<void> {
  if (userIds.length === 0) return

  const [_, users] = await Promise.all([
    prisma.appNotification.createMany({
      data: userIds.map((userId) => ({
        userId,
        title: payload.title,
        body: payload.body,
        url: payload.url,
      })),
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, lineUserId: true },
    }),
  ])

  for (const userId of userIds) {
    sendWebPushToUser(userId, {
      title: payload.title,
      body: payload.body,
      url: payload.url ?? '/',
    }).catch(() => {})
  }

  const lineIds = users.map((u) => u.lineUserId).filter((id): id is string => !!id)
  if (lineIds.length > 0) {
    sendLineMulticast(lineIds, `${payload.title}\n${payload.body}`).catch(() => {})
  }
}
