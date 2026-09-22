import type { Category } from '../types'

interface CategoryTabsProps {
  counts: Record<string, number>
  active: Category
  onChange: (c: Category) => void
}

export function CategoryTabs({ counts, active, onChange }: CategoryTabsProps) {
  const tabs: Array<{ key: Category; label: string; emoji: string }> = [
    { key: 'all', label: '전체', emoji: '🗞️' },
    { key: 'open_source', label: '오픈소스', emoji: '🟢' },
    { key: 'new_model', label: '신형모델', emoji: '🚀' },
    { key: 'industry', label: '업계', emoji: '🏢' },
  ]

  return (
    <nav className="tabs" role="tablist" aria-label="뉴스 카테고리">
      {tabs.map((t) => {
        const count = counts[t.key] ?? 0
        return (
          <button
            key={t.key}
            role="tab"
            aria-selected={active === t.key}
            className={`tab${active === t.key ? ' active' : ''}`}
            onClick={() => onChange(t.key)}
          >
            <span className="tab-emoji">{t.emoji}</span>
            <span className="tab-label">{t.label}</span>
            <span className="tab-count">{count}</span>
          </button>
        )
      })}
    </nav>
  )
}