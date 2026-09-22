const READ_KEY = 'ai-news:read'
const TRANS_KEY = 'ai-news:trans'

function readMap(key: string): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}')
  } catch {
    return {}
  }
}

function writeMap(key: string, map: Record<string, string>) {
  try {
    localStorage.setItem(key, JSON.stringify(map))
  } catch {
    /* quota exceeded — ignore */
  }
}

export function isRead(id: string): boolean {
  return id in readMap(READ_KEY)
}

export function markRead(id: string) {
  const map = readMap(READ_KEY)
  map[id] = String(Date.now())
  writeMap(READ_KEY, map)
}

export function getCachedTranslation(id: string): string | null {
  return readMap(TRANS_KEY)[id] ?? null
}

export function setCachedTranslation(id: string, text: string) {
  const map = readMap(TRANS_KEY)
  map[id] = text
  // 오래된 번역 캐시 정리 (최대 200개)
  const keys = Object.keys(map)
  if (keys.length > 200) {
    const toDelete = keys.slice(0, keys.length - 200)
    for (const k of toDelete) delete map[k]
  }
  writeMap(TRANS_KEY, map)
}