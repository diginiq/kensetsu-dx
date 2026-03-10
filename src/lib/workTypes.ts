export interface WorkTypeItem {
  label: string
  subTypes: string[]
}

export const WORK_TYPES: Record<string, WorkTypeItem[]> = {
  土木工事: [
    { label: '土工', subTypes: ['掘削', '盛土', '法面整形', '土砂運搬'] },
    { label: '基礎工', subTypes: ['杭打ち', '場所打杭', '既製杭', '地盤改良'] },
    { label: 'コンクリート工', subTypes: ['打設', '養生', '型枠', '鉄筋'] },
    { label: '舗装工', subTypes: ['下層路盤', '上層路盤', '基層', '表層'] },
    { label: '排水工', subTypes: ['側溝設置', '集水桝', '管渠敷設', 'U字溝'] },
    { label: '構造物工', subTypes: ['橋梁', '擁壁', 'カルバート', 'ボックス'] },
    { label: '仮設工', subTypes: ['仮囲い', '仮道路', '仮橋', '土留め'] },
  ],
  建築工事: [
    { label: '躯体工事', subTypes: ['基礎', '柱', '梁', '壁', 'スラブ'] },
    { label: '外装工事', subTypes: ['外壁', '屋根', '防水', '外部建具'] },
    { label: '内装工事', subTypes: ['床', '壁', '天井', '内部建具'] },
    { label: '設備工事', subTypes: ['電気', '給排水', '空調', '消防'] },
    { label: '外構工事', subTypes: ['舗装', '植栽', 'フェンス', '駐車場'] },
  ],
}

export const WORK_CATEGORIES = Object.keys(WORK_TYPES)

export function getWorkTypes(category: string): WorkTypeItem[] {
  return WORK_TYPES[category] ?? []
}

export function getSubTypes(category: string, workType: string): string[] {
  return WORK_TYPES[category]?.find((t) => t.label === workType)?.subTypes ?? []
}

// 令和年号変換
export function toJapaneseDate(date: Date): string {
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  if (y >= 2019) {
    return `令和${y - 2018}年${m}月${d}日`
  }
  if (y >= 1989) {
    return `平成${y - 1988}年${m}月${d}日`
  }
  return `${y}年${m}月${d}日`
}
