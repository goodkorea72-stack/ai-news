import type { Article } from '../types'
import { getCachedTranslation, setCachedTranslation } from './storage'

const MAX_CHARS = 4000 // MyMemory 1회 호출 상한 근사치

interface MyMemoryResponse {
  responseData?: { translatedText?: string }
  responseStatus?: number
}

/**
 * 영문 텍스트 → 한국어 번역 (MyMemory 무료 API, CORS 지원)
 * 기사별 결과는 localStorage에 캐시된다.
 */
export async function translateToKorean(
  article: Article,
  signal?: AbortSignal,
): Promise<{ title: string; summary: string }> {
  const cached = getCachedTranslation(article.id)
  if (cached) {
    const parts = cached.split('\n\n')
    return { title: parts[0] ?? '', summary: parts[1] ?? '' }
  }

  // 제목 + 요약을 하나의 텍스트로 번역 (요약은 500자 내외로 절단)
  const title = article.title.slice(0, 300)
  const summary = article.summary.slice(0, 600)
  const combined = `${title}\n\n${summary}`
  const text = combined.length > MAX_CHARS ? combined.slice(0, MAX_CHARS) : combined

  const q = encodeURIComponent(text)
  const url = `https://api.mymemory.translated.net/get?q=${q}&langpair=en|ko`

  const res = await fetch(url, { signal })
  if (!res.ok) throw new Error(`번역 실패 (HTTP ${res.status})`)
  const json = (await res.json()) as MyMemoryResponse
  const translated = json.responseData?.translatedText

  if (!translated) throw new Error('번역 결과가 비어있어요')

  // 번역 결과에서 제목/요약 분리
  const lines = translated.split('\n')
  const newTitle = (lines[0] ?? '').trim()
  const newSummary = lines.slice(1).join('\n').trim()

  const result = { title: newTitle, summary: newSummary }
  setCachedTranslation(article.id, `${result.title}\n\n${result.summary}`)
  return result
}