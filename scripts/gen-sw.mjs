// 서비스워커 자동 생성 — 빌드 산출물(dist/) 기준 precache + 오프라인 캐시
// 사용: node scripts/gen-sw.mjs  (npm run build 후 실행)
import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DIST = join(__dirname, '..', 'dist')
const BASE = '/ai-news/'
const CACHE = 'ai-news-static-v1'

function collectAssets(dir, prefix = '') {
  const out = []
  if (!existsSync(dir)) return out
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = `${prefix}/${entry.name}`
    if (entry.isDirectory()) out.push(...collectAssets(join(dir, entry.name), rel))
    else out.push(rel)
  }
  return out
}

// pre-cache 대상을 선정: 프레임워크의 해시 파일, 아이콘, manifest 포함
const jsCss = collectAssets(join(DIST, 'assets'), 'assets').filter((f) => /\.(js|css)$/.test(f))
const icons = collectAssets(join(DIST, 'icons'), 'icons')
const precache = [
  `${BASE}`,
  `${BASE}index.html`,
  `${BASE}manifest.webmanifest`,
  ...jsCss.map((f) => `${BASE}${f}`),
  ...icons.map((f) => `${BASE}${f}`),
]

const sw = `/* AI NEWS service worker — 자동 생성 (gen-sw.mjs) */
const CACHE_NAME = '${CACHE}'
const BASE_URL = '${BASE}'
const PRECACHE_URLS = ${JSON.stringify(precache, null, 2)}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // 뉴스 데이터: 네트워크 우선, 실패 시 캐시 폴백 (새 브리핑 우선 반영)
  if (url.pathname.includes('/data/news.json') || url.pathname.endsWith('/ai-news/')) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          return res
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match(BASE_URL)),
        ),
    )
    return
  }

  // 나머지 정적 리소스: stale-while-revalidate
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() => cached)
      return cached || fetchPromise
    }),
  )
})
`

writeFileSync(join(DIST, 'sw.js'), sw)
console.log(`  ✅ sw.js 생성 (precache ${precache.length}개)`)