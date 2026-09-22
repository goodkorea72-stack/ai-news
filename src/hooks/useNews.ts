import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Category, NewsPayload } from '../types'
import { fetchNewsWithFallback } from '../lib/newsApi'

interface UseNewsResult {
  payload: NewsPayload | null
  loading: boolean
  error: string | null
  lastUpdatedAt: number
  refresh: () => Promise<void>
}

async function loadNews(): Promise<{ payload: NewsPayload | null; error: string | null }> {
  try {
    const payload = await fetchNewsWithFallback()
    if (!payload) return { payload: null, error: '뉴스 데이터가 아직 없어요. 잠시 후 다시 시도해주세요.' }
    return { payload, error: null }
  } catch (e) {
    return { payload: null, error: e instanceof Error ? e.message : '뉴스를 불러오지 못했어요' }
  }
}

export function useNews(intervalMs = 5 * 60 * 1000): UseNewsResult {
  const [payload, setPayload] = useState<NewsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(0)
  const refreshingRef = useRef(false)

  const refresh = useCallback(async () => {
    if (refreshingRef.current) return
    refreshingRef.current = true
    setLoading(true)
    const { payload: p, error: e } = await loadNews()
    setPayload(p)
    setError(e)
    setLastUpdatedAt(Date.now())
    setLoading(false)
    refreshingRef.current = false
  }, [])

  useEffect(() => {
    void refresh()
    const timer = setInterval(() => void refresh(), intervalMs)
    return () => clearInterval(timer)
  }, [refresh, intervalMs])

  return { payload, loading, error, lastUpdatedAt, refresh }
}

/** 현재 시각 기준 남은 시간 계산 (1분마다 갱신) */
export function useNow(intervalMs = 30 * 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(t)
  }, [intervalMs])
  return now
}

export function useArticles(payload: NewsPayload | null, active: Category) {
  return useMemo(() => {
    if (!payload) return []
    if (active === 'all') return payload.articles
    return payload.articles.filter((a) => a.category.includes(active))
  }, [payload, active])
}