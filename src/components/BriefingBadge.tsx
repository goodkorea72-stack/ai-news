import type { NewsPayload } from '../types'
import { formatCountdown, formatKST } from '../types'

interface BriefingBadgeProps {
  payload: NewsPayload | null
  now: number
}

export function BriefingBadge({ payload, now }: BriefingBadgeProps) {
  if (!payload) return null
  const countdown = formatCountdown(payload.nextUpdate, now)
  const lastAt = formatKST(payload.generatedAt)

  return (
    <div className="briefing">
      <div className="briefing-left">
        <div className="briefing-pulse" aria-hidden="true" />
        <div>
          <div className="briefing-title">다음 브리핑</div>
          <div className="briefing-count" data-testid="countdown">
            {countdown ? `⏳ ${countdown} 후` : '곧 업데이트'}
          </div>
        </div>
      </div>
      <div className="briefing-right">
        <div className="briefing-now">기사 {payload.articleCount}건</div>
        <div className="briefing-now">마지막 {lastAt}</div>
      </div>
    </div>
  )
}