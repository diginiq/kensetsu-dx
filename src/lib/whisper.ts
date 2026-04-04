import OpenAI from 'openai'

let _openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!_openai) {
    if (!process.env.OPENAI_API_KEY) throw new Error('OPENAI_API_KEY が設定されていません')
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  }
  return _openai
}

/**
 * 音声ファイルを日本語テキストに変換（Whisper API）
 * @param audioBuffer  音声データのBuffer（webm/mp4/wav等）
 * @param mimeType     MIMEタイプ（audio/webm 等）
 * @returns 文字起こし結果テキスト
 */
export async function transcribeAudio(audioBuffer: Buffer, mimeType: string): Promise<string> {
  const openai = getOpenAI()

  // File オブジェクトとして渡す（OpenAI SDK v4 の形式）
  const ext = mimeType.split('/')[1]?.split(';')[0] ?? 'webm'
  const file = new File([new Uint8Array(audioBuffer)], `audio.${ext}`, { type: mimeType })

  const response = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'ja',
    response_format: 'text',
  })

  return typeof response === 'string' ? response : (response as { text: string }).text ?? ''
}
