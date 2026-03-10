import { z } from 'zod'

export const CLIENT_TYPE_OPTIONS = [
  { value: 'NATIONAL', label: '国' },
  { value: 'PREFECTURE', label: '県' },
  { value: 'MUNICIPAL', label: '市町村' },
  { value: 'PRIVATE', label: '民間' },
] as const

export const CLIENT_TYPE_LABEL: Record<string, string> = {
  NATIONAL: '国',
  PREFECTURE: '県',
  MUNICIPAL: '市町村',
  PRIVATE: '民間',
}

export const SITE_STATUS_LABEL: Record<string, string> = {
  PLANNING: '計画中',
  ACTIVE: '施工中',
  COMPLETED: '竣工済',
  SUSPENDED: '中断',
}

export const siteSchema = z.object({
  name: z
    .string()
    .min(1, '現場名を入力してください')
    .max(100, '現場名は100文字以内で入力してください'),
  clientName: z
    .string()
    .max(100, '発注者名は100文字以内で入力してください')
    .optional()
    .nullable(),
  clientType: z
    .enum(['NATIONAL', 'PREFECTURE', 'MUNICIPAL', 'PRIVATE'])
    .optional()
    .nullable(),
  address: z
    .string()
    .max(200, '住所は200文字以内で入力してください')
    .optional()
    .nullable(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  contractAmount: z
    .number()
    .int()
    .min(0, '0以上の金額を入力してください')
    .max(2_100_000_000, '入力可能な金額の上限は21億円です')
    .optional()
    .nullable(),
})

export type SiteInput = z.infer<typeof siteSchema>

export const siteUpdateSchema = siteSchema.extend({
  status: z.enum(['PLANNING', 'ACTIVE', 'COMPLETED', 'SUSPENDED']).optional(),
})

export type SiteUpdateInput = z.infer<typeof siteUpdateSchema>
