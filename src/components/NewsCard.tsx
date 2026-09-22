import { memo, useState } from 'react'
import type { Article } from '../types'
import { timeAgo } from '../types'
import { isRead, markRead } from '../lib/storage'
import { translateToKorean } from '../lib/translate'

interface NewsCardProps {
  article: Article
  now: number
}

interface TranslatedText {
  title: string
  summary: string
}

export const NewsCard = memo(function NewsCard({ article, now }: NewsCardProps) {
  const [translated, setTranslated] = useState<TranslatedText | null>(null)
  const [translating, setTranslating] = useState(false)
  const [transError, setTransError] = useState(false)

  const read = isRead(article.id)
  const ago = timeAgo(article.publishedAt, now)

  const handleTranslate = async () => {
    if (translated || translating) return
    setTranslating(true)
    setTransError(false)
    try {
      const result = await translateToKorean(article)
      setTranslated(result)
    } catch {
      setTransError(true)
    } finally {
      setTranslating(false)
    }
  }

  const handleOpen = () => {
    markRead(article.id)
    window.open(article.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <article className={`card${read ? ' read' : ''}`} onClick={handleOpen}>
      <div className="card-head">
        <span className="src">{article.icon} {article.source}</span>
        <span className="time">{ago}</span>
      </div>

      <h3 className="card-title">{translated ? translated.title : article.title}</h3>

      <p className="card-summary">
        {translated ? translated.summary : article.summary}
      </p>

      {!translated && transError && (
        <span className="trans-error">번역 실패 · 잠시 후 다시 시도해주세요</span>
      )}

      <div className="card-foot">
        <div className="tags">
          {article.category.map((c) => (
            <span key={c} className={`tag tag-${c}`}>
              {c === 'open_source' ? '오픈소스' : c === 'new_model' ? '신형모델' : '업계'}
            </span>
          ))}
        </div>
        <div className="actions">
          {!translated && (
            <button
              className="btn-translate"
              onClick={(e) => {
                e.stopPropagation()
                void handleTranslate()
              }}
              disabled={translating}
              aria-label="한국어 번역"
            >
              {translating ? '번역 중…' : '🇰🇷 번역'}
            </button>
          )}
          {translated && (
            <button
              className="btn-translate done"
              onClick={(e) => {
                e.stopPropagation()
                setTranslated(null)
              }}
              aria-label="원문 보기"
            >
              원문 보기
            </button>
          )}
          <span className="score" title={`AI 관련도 점수 ${article.score}`}>
            ⚡{article.score}
          </span>
        </div>
      </div>
    </article>
  )
})