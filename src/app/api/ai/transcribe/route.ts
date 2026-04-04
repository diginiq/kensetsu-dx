import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { canCreateAIReport } from '@/lib/roles'
import { checkAndLogAIUsage } from '@/lib/aiUsage'
import { transcribeAudio } from '@/lib/whisper'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)
  if (!session || !canCreateAIReport(session.user.role) || !session.user.companyId) {
    return NextResponse.json({ error: '権限なし' }, { status: 403 })
  }

  // AI使用量チェック
  const usageError = await checkAndLogAIUsage({
    companyId: session.user.companyId,
    userId: session.user.id,
    feature: 'transcribe',
  })
  if (usageError) {
    return NextResponse.json({ error: usageError }, { status: 429 })
  }

  // 音声ファイル取得
  let audioBuffer: Buffer
  let mimeType: string
  try {
    const formData = await req.formData()
    const file = formData.get('audio')
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: '音声ファイルが見つかりません' }, { status: 400 })
    }
    mimeType = file.type || 'audio/webm'
    const arrayBuffer = await file.arrayBuffer()
    audioBuffer = Buffer.from(arrayBuffer)
  } catch {
    return NextResponse.json({ error: '音声ファイルの読み込みに失敗しました' }, { status: 400 })
  }

  // Whisper文字起こし
  try {
    const transcription = await transcribeAudio(audioBuffer, mimeType)
    return NextResponse.json({ transcription })
  } catch (err) {
    console.error('Whisper transcription error:', err)
    return NextResponse.json({ error: '音声の文字起こしに失敗しました' }, { status: 500 })
  }
}
