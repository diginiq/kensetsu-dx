// 労働時間計算ユーティリティ

export type WorkCategory = {
  category: string
  detail: string
  hours: number
  memo?: string
}

/** 実働分数を計算 */
export function calcWorkingMinutes(startTime: Date, endTime: Date, breakMinutes: number): number {
  const totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / 60000)
  return Math.max(0, totalMinutes - breakMinutes)
}

/** 残業分数を計算（8時間超過分） */
export function calcOvertimeMinutes(workingMinutes: number): number {
  return Math.max(0, workingMinutes - 8 * 60)
}

/** 分→時間:分 表示 */
export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}時間${m > 0 ? `${m}分` : ''}`
}

/** 分→小数時間 */
export function minutesToHours(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10
}

export const WEATHER_OPTIONS = [
  { value: '晴れ', icon: '☀️' },
  { value: '曇り', icon: '☁️' },
  { value: '雨', icon: '🌧️' },
  { value: '雪', icon: '❄️' },
]

export const REPORT_STATUS_LABEL: Record<string, string> = {
  DRAFT: '下書き',
  SUBMITTED: '提出済み',
  APPROVED: '承認済み',
  REJECTED: '差戻し',
}

export const REPORT_STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-blue-100 text-blue-700',
  APPROVED: 'bg-green-100 text-green-800',
  REJECTED: 'bg-red-100 text-red-700',
}
