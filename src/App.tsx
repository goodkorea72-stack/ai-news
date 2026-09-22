import { useCallback, useEffect, useRef, useState } from 'react'
import type { Category } from './types'
import { useArticles, useNews, useNow } from './hooks/useNews'
import { BriefingBadge } from './components/BriefingBadge'
import { CategoryTabs } from './components/CategoryTabs'
import { NewsCard } from './components/NewsCard'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const CATEGORY_KEYS: Category[] = ['all', 'open_source', 'new_model', 'industry']

export default function App() {
  const { payload, loading, error, lastUpdatedAt, refresh } = useNews()
  const now = useNow()
  const [active, setActive] = useState<Category>('all')
  const articles = useArticles(payload, active)
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef<number | null>(null)

  // PWA 설치 프롬프트 캡처
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setInstallEvt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // 당겨서 새로고침
  const onTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (window.scrollY === 0) startY.current = e.touches[0].clientY
  }, [])
  const onTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (startY.current === null) return
    const dy = e.touches[0].clientY - startY.current
    if (dy > 70) {
      startY.current = null
      setRefreshing(true)
      void refresh().finally(() => setRefreshing(false))
    }
  }, [refresh])
  const onTouchEnd = useCallback(() => {
    startY.current = null
  }, [])

  const counts: Record<string, number> = { all: payload?.articleCount ?? 0 }
  for (const c of CATEGORY_KEYS) {
    if (c === 'all') continue
    counts[c] = payload?.articles.filter((a) => a.category.includes(c)).length ?? 0
  }

  return (
    <div
      className="app"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <header className="header">
        <div className="header-left">
          <span className="logo">🤖</span>
          <div>
            <h1 className="title">AI NEWS</h1>
            <span className="subtitle">오픈소스 & 신형 AI · 12시간 브리핑</span>
          </div>
        </div>
        <div className="header-right">
          {installEvt && (
            <button
              className="btn-install"
              onClick={() => {
                void installEvt.prompt()
                setInstallEvt(null)
              }}
            >
              📲 설치
            </button>
          )}
          <button
            className="icon-btn"
            onClick={() => void refresh()}
            aria-label="새로고침"
            title="새로고침"
          >
            🔄
          </button>
        </div>
      </header>

      <BriefingBadge payload={payload} now={now} />

      <CategoryTabs counts={counts} active={active} onChange={setActive} />

      {refreshing && <div className="pull-hint">새로고침 중…</div>}

      <main className="list">
        {loading && !payload && (
          <div className="skeleton-wrap">
            {Array.from({ length: 6 }).map((_, i) => (
              <div className="skeleton card" key={i}>
                <div className="sk-line sk-30" />
                <div className="sk-line sk-80" />
                <div className="sk-line sk-60" />
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="empty">
            <div className="empty-emoji">📡</div>
            <p>{error}</p>
            <button className="retry-btn" onClick={() => void refresh()}>
              다시 시도
            </button>
          </div>
        )}

        {!loading && !error && articles.length === 0 && (
          <div className="empty">
            <div className="empty-emoji">🌵</div>
            <p>이 카테고리에 뉴스가 없어요</p>
          </div>
        )}

        {articles.map((a) => (
          <NewsCard key={a.id} article={a} now={now} />
        ))}
      </main>

      <footer className="footer">
        {payload ? (
          <span>
            {payload.articleCount}건 브리핑 · {payload.totalCollected}건 스캔 ·{' '}
            {new Date(payload.generatedAt).toLocaleString('ko-KR')} 생성
            {lastUpdatedAt ? ` · ${new Date(lastUpdatedAt).toLocaleTimeString('ko-KR')} 갱신` : ''}
          </span>
        ) : (
          <span>AI NEWS — open source intelligence</span>
        )}
      </footer>
    </div>
  )
}