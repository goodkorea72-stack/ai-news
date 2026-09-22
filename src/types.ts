export type Category = 'all' | 'open_source' | 'new_model' | 'industry'

export interface Article {
  id: string
  title: string
  summary: string
  url: string
  source: string
  sourceId: string
  icon: string
  category: Array<'open_source' | 'new_model' | 'industry'>
  score: number
  publishedAt: string
}

export interface NewsPayload {
  generatedAt: string
  nextUpdate: string
  intervalHours: number
  timezone: string
  totalCollected: number
  articleCount: number
  articles: Article[]
}

export const CATEGORY_LABELS: Record<Category, string> = {
  all: '전체',
  open_source: '오픈소스',
  new_model: '신형모델',
  industry: '업계',
}

export const CATEGORY_EMOJI: Record<Category, string> = {
  all: '🗞️',
  open_source: '🟢',
  new_model: '🚀',
  industry: '🏢',
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&#0*39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim()
}

export function timeAgo(iso: string, now: number = Date.now()): string {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, now - t)
  const min = Math.floor(diff / 60000)
  if (min < 1) return '방금 전'
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}일 전`
  return new Date(iso).toLocaleDateString()
}

export function formatCountdown(targetIso: string, now: number = Date.now()): string {
  const t = new Date(targetIso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Math.max(0, t - now)
  const hr = Math.floor(diff / 3600000)
  const min = Math.floor((diff % 3600000) / 60000)
  if (hr > 0) return `${hr}시간 ${min}분`
  return `${min}분`
}

export function formatKST(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
}