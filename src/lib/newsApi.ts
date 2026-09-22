import { decodeEntities, type Article, type NewsPayload } from '../types'

const NEWS_PATH = `${import.meta.env.BASE_URL}data/news.json`

/**
 * 뉴스 데이터 로드.
 * 캐시 우회(no-cache)로 GitHub Pages의 신선한 JSON을 읽는다.
 */
export async function fetchNews(): Promise<NewsPayload> {
  const res = await fetch(NEWS_PATH, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`뉴스 데이터를 불러오지 못했어요 (HTTP ${res.status})`)
  const payload = (await res.json()) as NewsPayload

  // 수집기에서 남은 HTML 엔티티 정리
  payload.articles = payload.articles.map((a: Article) => ({
    ...a,
    title: decodeEntities(a.title),
    summary: decodeEntities(a.summary),
  }))
  return payload
}

export async function fetchNewsWithFallback(): Promise<NewsPayload | null> {
  try {
    return await fetchNews()
  } catch {
    // 오프라인 fallback: 캐시에서 로드
    try {
      const cached = await caches.open('ai-news-static-v1')
      const cachedRes = await cached.match(new Request(NEWS_PATH))
      if (cachedRes) return (await cachedRes.json()) as NewsPayload
    } catch {
      /* ignore */
    }
    return null
  }
}