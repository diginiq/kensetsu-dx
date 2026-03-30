import Link from 'next/link'
import { MessageSquarePlus } from 'lucide-react'

type Conv = {
  id: string
  subject: string
  lastMessageAt: Date
  participants: { userId: string; lastReadAt: Date; user: { name: string } }[]
  messages: { body: string; createdAt: Date; senderId: string }[]
}

interface Props {
  conversations: Conv[]
  currentUserId: string
  basePath: string
  newMessageHref: string
  title?: string
  showLogo?: boolean
  /** true のとき /manage などレイアウト内用（独自ヘッダーなし） */
  embedded?: boolean
}

export function ConversationListView({
  conversations,
  currentUserId,
  basePath,
  newMessageHref,
  title = 'メッセージ',
  showLogo = true,
  embedded = false,
}: Props) {
  const listBody =
    conversations.length === 0 ? (
      <div className="bg-white rounded-xl p-8 text-center border border-gray-200 shadow-sm mt-4">
        <p className="text-gray-400">メッセージはまだありません</p>
        <Link
          href={newMessageHref}
          className="inline-block mt-3 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          style={{ backgroundColor: '#E85D04', color: 'white' }}
        >
          新しいメッセージを作成
        </Link>
      </div>
    ) : (
      <div className="space-y-2">
        {conversations.map((conv) => {
          const participant = conv.participants.find((p) => p.userId === currentUserId)
          const lastMsg = conv.messages[0]
          const hasUnread =
            participant && lastMsg
              ? lastMsg.createdAt > participant.lastReadAt && lastMsg.senderId !== currentUserId
              : false
          const otherParticipants = conv.participants
            .filter((p) => p.userId !== currentUserId)
            .map((p) => p.user.name)
            .join(', ')

          return (
            <Link
              key={conv.id}
              href={`${basePath}/${conv.id}`}
              className={`block bg-white rounded-xl border shadow-sm p-4 transition-colors hover:bg-gray-50 ${
                hasUnread ? 'border-orange-300' : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {hasUnread && (
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: '#E85D04' }} />
                    )}
                    <p
                      className={`text-sm truncate ${
                        hasUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'
                      }`}
                    >
                      {conv.subject}
                    </p>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{otherParticipants}</p>
                  {lastMsg && <p className="text-sm text-gray-500 mt-1 truncate">{lastMsg.body}</p>}
                </div>
                <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                  {formatDate(conv.lastMessageAt)}
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    )

  if (embedded) {
    return <div className="max-w-3xl">{listBody}</div>
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="text-white px-4 py-3" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showLogo && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src="/logo.png" alt="KSDX" width={32} height={32} className="rounded" />
            )}
            <p className="font-bold">{title}</p>
          </div>
          <Link
            href={newMessageHref}
            className="flex items-center gap-1 text-sm bg-white/20 hover:bg-white/30 rounded-lg px-3 py-1.5 transition-colors"
          >
            <MessageSquarePlus size={16} />
            新規
          </Link>
        </div>
      </header>

      <main className="max-w-screen-sm mx-auto px-4 py-4 pb-24">{listBody}</main>
    </div>
  )
}

function formatDate(date: Date) {
  const now = new Date()
  const d = new Date(date)
  const diffMs = now.getTime() - d.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'たった今'
  if (diffMin < 60) return `${diffMin}分前`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}時間前`
  if (d.toDateString() === new Date(now.getTime() - 86400000).toDateString()) return '昨日'
  return `${d.getMonth() + 1}/${d.getDate()}`
}
