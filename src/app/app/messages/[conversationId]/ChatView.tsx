'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send } from 'lucide-react'
import Link from 'next/link'

interface Msg {
  id: string
  body: string
  senderId: string
  senderName: string
  createdAt: string
}

interface Props {
  conversationId: string
  subject: string
  currentUserId: string
  participants: { id: string; name: string; role: string }[]
  initialMessages: Msg[]
}

export function ChatView({ conversationId, subject, currentUserId, participants, initialMessages }: Props) {
  const router = useRouter()
  const [messages, setMessages] = useState<Msg[]>(initialMessages)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/messages/${conversationId}`)
        if (res.ok) {
          const data = await res.json()
          setMessages(data.messages.map((m: { id: string; body: string; senderId: string; sender: { id: string; name: string }; createdAt: string }) => ({
            id: m.id,
            body: m.body,
            senderId: m.sender.id,
            senderName: m.sender.name,
            createdAt: m.createdAt,
          })))
        }
      } catch { /* ignore */ }
    }, 5000)
    return () => clearInterval(interval)
  }, [conversationId])

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
        setMessages((prev) => [...prev, {
          id: msg.id,
          body: msg.body,
          senderId: msg.sender.id,
          senderName: msg.sender.name,
          createdAt: msg.createdAt,
        }])
        setInput('')
        inputRef.current?.focus()
      }
    } catch { /* ignore */ }
    setSending(false)
  }

  const otherNames = participants.filter((p) => p.id !== currentUserId).map((p) => p.name).join(', ')

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      {/* ヘッダー */}
      <header className="text-white px-4 py-3 shrink-0" style={{ backgroundColor: '#455A64' }}>
        <div className="max-w-screen-sm mx-auto flex items-center gap-3">
          <Link href="/app/messages" className="text-white/80 hover:text-white">
            <ArrowLeft size={20} />
          </Link>
          <div className="min-w-0">
            <p className="font-bold text-sm truncate">{subject}</p>
            <p className="text-xs text-white/60 truncate">{otherNames}</p>
          </div>
        </div>
      </header>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="max-w-screen-sm mx-auto space-y-3">
          {messages.map((msg, i) => {
            const isMine = msg.senderId === currentUserId
            const showName = !isMine && (i === 0 || messages[i - 1].senderId !== msg.senderId)
            const time = new Date(msg.createdAt).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

            return (
              <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] ${isMine ? 'items-end' : 'items-start'}`}>
                  {showName && (
                    <p className="text-xs text-gray-400 mb-1 px-1">{msg.senderName}</p>
                  )}
                  <div className={`flex items-end gap-1.5 ${isMine ? 'flex-row-reverse' : ''}`}>
                    <div
                      className={`px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                        isMine
                          ? 'bg-orange-500 text-white rounded-br-md'
                          : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md'
                      }`}
                    >
                      {msg.body}
                    </div>
                    <span className="text-[10px] text-gray-400 shrink-0 pb-0.5">{time}</span>
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* 入力エリア */}
      <div className="shrink-0 bg-white border-t border-gray-200 px-4 py-3" style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
        <div className="max-w-screen-sm mx-auto flex items-end gap-2">
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
