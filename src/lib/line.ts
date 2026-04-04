/**
 * LINE Messaging API 通知ユーティリティ
 *
 * 環境変数:
 *   LINE_CHANNEL_ACCESS_TOKEN  - チャネルアクセストークン（長期）
 *
 * 未設定の場合はサイレントスキップ（開発環境でも安全）
 */

const LINE_API = 'https://api.line.me/v2/bot/message/push'

export interface LineMessage {
  type: 'text'
  text: string
}

/** 単一ユーザーにテキストメッセージを送信 */
export async function sendLineMessage(
  lineUserId: string,
  text: string,
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) return // 未設定はスキップ

  await fetch(LINE_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      to: lineUserId,
      messages: [{ type: 'text', text }],
    }),
  }).catch(() => {}) // 失敗は本処理に影響させない
}

/** 複数ユーザーに一括送信（multicast: 最大500件） */
export async function sendLineMulticast(
  lineUserIds: string[],
  text: string,
): Promise<void> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token || lineUserIds.length === 0) return

  // 500件ずつ分割
  const chunks: string[][] = []
  for (let i = 0; i < lineUserIds.length; i += 500) {
    chunks.push(lineUserIds.slice(i, i + 500))
  }

  await Promise.all(
    chunks.map((ids) =>
      fetch('https://api.line.me/v2/bot/message/multicast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: ids,
          messages: [{ type: 'text', text }],
        }),
      }).catch(() => {}),
    ),
  )
}

/** LINE連携URLを生成（フロントで使用） */
export function getLineAddFriendUrl(): string {
  const botBasicId = process.env.LINE_BOT_BASIC_ID ?? ''
  return `https://line.me/R/ti/p/${botBasicId}`
}
