import Anthropic from '@anthropic-ai/sdk'

let _client: Anthropic | null = null

function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) throw new Error('ANTHROPIC_API_KEY が設定されていません')
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  }
  return _client
}

export type ReportType = 'WORK_DIARY' | 'SITE_JOURNAL'

export interface GeneratedReport {
  weather: string
  temperature: number | null
  startTime: string // HH:MM
  endTime: string   // HH:MM
  workCategories: { category: string; description: string; workerCount: number }[]
  memo: string
  safetyNotes: string
}

const WORK_DIARY_PROMPT = (siteName: string, date: string, transcription: string) => `
あなたは建設現場の作業日報作成の専門家です。
職長が現場で話した音声メモから、元請け（ゼネコン）への提出用「作業日報」を正式な書式で作成してください。

【現場情報】
現場名: ${siteName}
日付: ${date}

【音声メモ（文字起こし）】
${transcription}

【出力規則】
- 主語は「我々は〜」「本班は〜」「〇〇班は〜」
- 個々の職人の工種・人数・作業内容を具体的に記載
- 専門用語を正確に使用（型枠組立、コンクリート打設、鉄筋組立、足場架設等）
- 天気・気温は音声から判断できない場合は推測で構わない
- 開始・終了時間は音声中の言及から抽出（なければ 08:00/17:00）

以下のJSON形式のみで返答してください（余分なテキスト不要）:
{
  "weather": "晴れ",
  "temperature": 22,
  "startTime": "08:00",
  "endTime": "17:00",
  "workCategories": [
    { "category": "型枠工", "description": "2階スラブ型枠組立。南側から北側へ進行", "workerCount": 4 }
  ],
  "memo": "作業は予定通り進捗。明日は型枠検査を予定。",
  "safetyNotes": "KY活動実施。高所作業時の安全帯着用を全員確認済み。"
}
`.trim()

const SITE_JOURNAL_PROMPT = (siteName: string, date: string, transcription: string, foremanSummaries: string) => `
あなたは建設現場の工事日誌作成の専門家です。
現場監督の音声メモと各職長の作業日報サマリーを統合し、発注者（役所・施主）への提出用「工事日誌」を正式な書式で作成してください。

【現場情報】
現場名: ${siteName}
日付: ${date}

【現場監督の音声メモ（文字起こし）】
${transcription}

【本日の各職長作業日報サマリー】
${foremanSummaries || '（本日の職長日報なし）'}

【出力規則】
- 工事全体の視点で記述（「本工事は〜」「本日の施工は〜」）
- 工種ごとの大きな進捗を発注者が理解できる粒度で記載
- 工程管理（計画比進捗率）・品質管理・安全管理の観点を含める
- 主語は「本工事では〜」「本日の施工において〜」

以下のJSON形式のみで返答してください（余分なテキスト不要）:
{
  "weather": "晴れ",
  "temperature": 22,
  "startTime": "08:00",
  "endTime": "17:00",
  "workCategories": [
    { "category": "躯体工事", "description": "2階スラブ型枠組立完了。配筋検査は明日を予定", "workerCount": 12 }
  ],
  "memo": "本日の施工は全体的に順調。工程計画比 102%で進捗。特記事項なし。",
  "safetyNotes": "本日の安全管理：朝礼KY活動実施。高所作業箇所の安全確認完了。ヒヤリハットなし。"
}
`.trim()

/**
 * 音声文字起こしから日報を生成（Claude Haiku）
 */
export async function generateReport(params: {
  transcription: string
  reportType: ReportType
  siteName: string
  date: string
  foremanSummaries?: string
  usageCallback?: (inputTokens: number, outputTokens: number) => void
}): Promise<GeneratedReport> {
  const client = getClient()

  const prompt = params.reportType === 'WORK_DIARY'
    ? WORK_DIARY_PROMPT(params.siteName, params.date, params.transcription)
    : SITE_JOURNAL_PROMPT(params.siteName, params.date, params.transcription, params.foremanSummaries ?? '')

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  })

  if (params.usageCallback) {
    params.usageCallback(message.usage.input_tokens, message.usage.output_tokens)
  }

  const text = message.content[0].type === 'text' ? message.content[0].text : ''

  // JSON抽出（コードブロックで囲まれている場合も対応）
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('AIの返答からJSONを抽出できませんでした')

  return JSON.parse(jsonMatch[0]) as GeneratedReport
}
