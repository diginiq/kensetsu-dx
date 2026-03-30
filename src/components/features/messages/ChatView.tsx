'use client'

import { useState, useRef, useEffect } from 'react'
import { ArrowLeft, Send, Paperclip, FileIcon } from 'lucide-react'
import Link from 'next/link'
import { useSocket } from '@/components/providers/SocketProvider'

interface Msg {
  id: string
  body: string
  senderId: string
  senderName: string
  createdAt: string
  fileUrl?: string | null
  fileAccessUrl?: string | null
  fileName?: string | null
  fileType?: string | null
}

interface Props {
  conversationId: string
  subject: string
  currentUserId: string
  participants: { id: string; name: string; role: string }[]
  initialMessages: Msg[]
  readStatus: Record<string, string>
  /** 一覧へ戻るリンク（例: /app/messages または /manage/messages） */
  listHref: string
}

function fileDisplayHref(msg: Msg): string | null {
  return msg.fileAccessUrl ?? msg.fileUrl ?? null
}

export function ChatView({
  conversationId,
  subject,
  currentUserId,
  participants,
  initialMessages,
  readStatus: initialReadStatus,
  listHref,
}: Props) {
  const { socket, refreshUnread } = useSocket()
  const [messages, setMessages] = useState<Msg[]>(initialMessages)
  const [readStatus, setReadStatus] = useState<Record<string, string>>(initialReadStatus)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!socket) return

    socket.emit('join-conversation', conversationId)

    const handleNewMessage = (msg: Msg) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      fetch(`/api/messages/${conversationId}/read`, { method: 'POST' })
      socket.emit('mark-read', { conversationId, lastReadAt: new Date().toISOString() })
      refreshUnread()
    }

    const handleReadUpdate = (data: { conversationId: string; userId: string; lastReadAt: string }) => {
      if (data.conversationId === conversationId) {
        setReadStatus((prev) => ({ ...prev, [data.userId]: data.lastReadAt }))
      }
    }

    socket.on('new-message', handleNewMessage)
    socket.on('read-update', handleReadUpdate)

    return () => {
      socket.emit('leave-conversation', conversationId)
      socket.off('new-message', handleNewMessage)
      socket.off('read-update', handleReadUpdate)
    }
  }, [socket, conversationId, refreshUnread])

  function getReadCount(msgCreatedAt: string) {
    const others = participants.filter((p) => p.id !== currentUserId)
    return others.filter((p) => {
      const readAt = readStatus[p.id]
      return readAt && new Date(readAt) >= new Date(msgCreatedAt)
    }).length
  }

  async function handleSend() {
    if (!input.trim() || sending) return
    setSending(true)
    try {
      const res = await fetch(`/api/messages/${conversationId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: input.trim() }),
      })
      if (res.ok) {
        const msg = await res.json()
        const newMsg: Msg = {
          id: msg.id,
          body: msg.body,
          senderId: msg.sender.id,
          senderName: msg.sender.name,
          createdAt: msg.createdAt,
          fileUrl: msg.fileUrl,
          fileAccessUrl: msg.fileAccessUrl ?? null,
          fileName: msg.fileName,
          fileType: msg.fileType,
        }
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, newMsg]))
        setInput('')
        inputRef.current?.focus()
        refreshUnread()
      }
    } catch {
      /* ignore */
    }
    setSending(false)
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('conversationId', conversationId)
      const res = await fetch(`/api/messages/${conversationId}/upload`, { method: 'POST', body: formData })
      if (res.ok) {
        const msg = await res.json()
        const newMsg: Msg = {
          id: msg.id,
          body: msg.body,
          senderId: msg.sender.id,
          senderName: msg.sender.name,
          createdAt: msg.createdAt,
          fileUrl: msg.fileUrl,
          fileAccessUrl: msg.fileAccessUrl ?? null,
          fileName: msg.fileName,
          fileType: msg.fileType,
        }
        setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, newMsg]))
        refreshUnread()
      }
    } catch {
      /* ignore */
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const otherNames = participants.filter((p) => p.id !== currentUserId).map((p) => p.name).join(', ')
  const othersCount = participants.filter((p) => p.id !== currentUserId).length

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <header className="text-white px-4 py-3 shrink-0" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link href={listHref} className="text-white/80 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{subject}</p>
            <p className="text-xs text-white/60 truncate">{otherNames}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-screen-sm mx-auto space-y-3">
          {messages.map((msg, i) => {
            const isMine = msg.senderId === currentUserId
            const showName = !isMine && (i === 0 || messages[i - 1].senderId !== msg.senderId)
            const time = new Date(msg.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
            const readCount = isMine ? getReadCount(msg.createdAt) : 0
            const href = fileDisplayHref(msg)

            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                  {showName && <p className="text-xs text-gray-400 mb-1 px-1">{msg.senderName}</p>}
                  <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMine
                          ? 'bg-orange-500 text-white rounded-br-md'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                      }`}
                    >
                      {href && (
                        <div className="mb-1.5">
                          {msg.fileType?.startsWith('image/') ? (
                            <a href={href} target="_blank" rel="noopener noreferrer">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={href} alt={msg.fileName ?? ''} className="rounded-lg max-w-full max-h-48 object-cover" />
                            </a>
                          ) : (
                            <a
                              href={href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={`flex items-center gap-2 text-xs underline ${isMine ? 'text-white/90' : 'text-blue-600'}`}
                            >
                              <FileIcon size={14} />
                              {msg.fileName ?? 'ファイル'}
                            </a>
                          )}
                        </div>
                      )}
                      {msg.body}
                    </div>
                    <div className="flex flex-col items-end shrink-0 pb-0.5">
                      {isMine && readCount > 0 && (
                        <span className="text-[10px] text-blue-500 font-medium">
                          既読{othersCount > 1 ? readCount : ''}
                        </span>
                      )}
                      <span className="text-[10px] text-gray-400">{time}</span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      <div
        className="shrink-0 bg-white border-t border-gray-200 px-4 py-3"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-screen-sm mx-auto flex items-end gap-2">
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
            onChange={handleFile}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            {uploading ? (
              <span className="w-5 h-5 border-2 border-gray-300 border-t-orange-500 rounded-full animate-spin" />
            ) : (
              <Paperclip size={20} />
            )}
          </button>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="メッセージを入力..."
            rows={1}
            className="flex-1 resize-none rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 max-h-24"
          />
          <button
            type="button"
            onClick={handleSend}
            disabled={!input.trim() || sending}
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-white disabled:opacity-40 transition-colors"
            style={{ backgroundColor: '#E85D04' }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
