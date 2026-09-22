#!/usr/bin/env node
/**
 * AI NEWS — 뉴스 수집기 (fetch-news.mjs)
 * ------------------------------------------------
 * 오픈소스 AI & 신형 AI 뉴스를 RSS/HTML에서 수집,
 * 키워드 스코어링으로 정렬하여 public/data/news.json 생성.
 *
 * GitHub Actions에서 12시간마다 실행 (cron: 0 0,12 * * *)
 */
import { XMLParser } from 'fast-xml-parser'
import * as cheerio from 'cheerio'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SOURCES_PATH = join(__dirname, 'sources.json')
const OUTPUT_PATH = join(ROOT, 'public', 'data', 'news.json')

// ────────────────────────────────────────────────
// 설정
// ────────────────────────────────────────────────
const INTERVAL_HOURS = 12
const MAX_ARTICLES = 60          // 최종 노출 기사 수
const FETCH_TIMEOUT_MS = 15000   // 소스별 타임아웃
const MIN_SCORE = 1              // 스코어 최소값 (1 미만 제외)

// 키워드 가중치 (제목+본문에서 매칭 횟수로 스코어링)
const KEYWORDS = {
  high: [ // 오픈소스 / 로컬 LLM — 최우선
    'open source', 'open-source', 'open weight', 'open-weight', 'openweight',
    'llama', 'qwen', 'mistral', 'deepseek', 'gemma', 'nemotron', 'olmo',
    'phi-', 'granite', 'aya', 'bloom', 'falcon', 'mpt-', 'groq',
    'ollama', 'local llm', 'local llama', 'gguf', 'mlx', 'vllm', 'llamacpp',
    'finetun', 'fine-tun', 'quantiz', 'transformers', 'diffus', 'stable diffusion',
    'flux', 'sdxl', 'comfyui', 'lm studio', 'huggingface', 'hugging face',
    'weights', 'checkpoint', 'openai-compatible',
  ],
  models: [ // 신형 AI / 프론티어 모델
    'gpt-5', 'gpt-4', 'gpt-6', 'o3', 'o4', 'gemini', 'claude', 'grok',
    'sonnet', 'opus', 'haiku', 'nova', 'reasoning', 'multimodal', 'frontier',
    'vision model', 'tts', 'text-to-video', 'world model', 'vla',
    'openai', 'anthropic', 'deepmind', 'xai', 'google gemini',
  ],
  tech: [ // AI 기술 / 산업
    'agent', 'mcp', 'rag', 'inference', 'training', 'benchmark', 'milestone',
    'release', 'launch', 'announce', 'api', 'pricing', 'cuda', 'gpu',
    'memory', 'context window', 'tool use', 'function calling', 'eval',
  ],
}

// 기본 필터 — 이 단어가 하나도 없으면 AI 관련이 아닌 것으로 간주
const BASE_FILTER = [
  'ai', 'llm', 'model', 'machine learning', 'deep learning', 'neural',
  'language model', 'inference', 'training', 'gpt', 'transformer',
  'agent', 'diffusion', 'chatbot', 'openai', 'anthropic', 'google',
  'meta', 'mistral', 'llama', 'qwen', 'deepseek', 'github', 'open source',
]

// ────────────────────────────────────────────────
// 유틸
// ────────────────────────────────────────────────
async function fetchWithTimeout(url, options = {}, timeout = FETCH_TIMEOUT_MS) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AI-News-Bot/1.0; +https://github.com/goodkorea72-stack/ai-news)',
        Accept: 'application/rss+xml, application/xml, text/xml, text/html, application/json, */*',
        ...(options.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.text()
  } finally {
    clearTimeout(timer)
  }
}

function stripHtml(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function makeId(text) {
  return createHash('sha1').update(text).digest('hex').slice(0, 12)
}

const scoreCache = new Map()
function scoreArticle(title, summary) {
  const text = `${title} ${summary}`.toLowerCase()
  const key = title.toLowerCase()
  if (scoreCache.has(key)) return scoreCache.get(key)

  // 기본 AI 필터 — 아예 관련 없는 기사 제외
  const isAIRelated = BASE_FILTER.some((kw) => text.includes(kw))
  if (!isAIRelated) {
    const none = { score: 0, tags: new Set() }
    scoreCache.set(key, none)
    return none
  }

  let score = 0
  const tags = new Set()
  for (const kw of KEYWORDS.high) {
    if (text.includes(kw)) {
      score += 3
      tags.add('open_source')
    }
  }
  for (const kw of KEYWORDS.models) {
    if (text.includes(kw)) {
      score += 2
      tags.add('new_model')
    }
  }
  for (const kw of KEYWORDS.tech) {
    if (text.includes(kw)) {
      score += 1
      tags.add('industry')
    }
  }
  scoreCache.set(key, { score, tags })
  return { score, tags }
}

// ────────────────────────────────────────────────
// 소스별 수집기
// ────────────────────────────────────────────────
async function collectRSS(source) {
  const xml = await fetchWithTimeout(source.url)
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
  })
  const doc = parser.parse(xml)
  const channel = doc?.rss?.channel ?? doc?.feed ?? null
  if (!channel) throw new Error('RSS 구조 인식 실패')

  // RSS 2.0: channel.item[] / Atom: feed.entry[]
  let items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : []
  if (items.length === 0) {
    items = Array.isArray(channel.entry) ? channel.entry : channel.entry ? [channel.entry] : []
  }

  return items
    .slice(0, source.maxItems ?? 100)
    .map((item) => {
      const title = stripHtml(item.title ?? '')
      const link = item.link?.$?.href ?? item.link ?? item['@_href'] ?? ''
      const rawContent = item['content:encoded'] ?? item.description ?? item.content ?? ''
      const summary = stripHtml(rawContent).slice(0, 500)
      const pubRaw = item.pubDate ?? item.updated ?? item.published ?? ''
      return { title, link, summary, publishedAt: pubRaw, source }
    })
}

async function collectGitHubTrending(source) {
  const html = await fetchWithTimeout(source.url)
  const $ = cheerio.load(html)
  const articles = []

  $('article.Box-row').each((_, el) => {
    const $row = $(el)
    const $title = $row.find('h2 a')
    let title = $title.text().replace(/\s+/g, ' ').trim()
    const href = $title.attr('href') ?? ''
    const desc = $row.find('p').text().replace(/\s+/g, ' ').trim()
    if (!href) return
    let lang = ''
    const langEl = $row.find('[itemprop="programmingLanguage"]').first()
    if (langEl.length) lang = langEl.text().trim()
    if (title && lang && lang !== title) {
      title = `${title} (${lang})`
    }
    const link = `https://github.com${href}`
    articles.push({
      title,
      link,
      summary: desc ? `GitHub 인기 오픈소스 프로젝트: ${desc}` : 'GitHub 오늘의 인기 오픈소스 프로젝트',
      publishedAt: new Date().toUTCString(),
      source,
    })
  })
  return articles
}

async function collectRedditJSON(source) {
  const json = await fetchWithTimeout(source.url)
  const doc = JSON.parse(json)
  const posts = doc?.data?.children ?? []
  return posts
    .map(({ data: post }) => ({
      title: post.title ?? '',
      link: post.url ?? '',
      summary: post.selftext ? `[r/LocalLLaMA] ${stripHtml(post.selftext).slice(0, 400)}` : `[r/LocalLLaMA] ${(post.title ?? '').slice(0, 200)}`,
      publishedAt: post.created_utc
        ? new Date(post.created_utc * 1000).toUTCString()
        : new Date().toUTCString(),
      source,
    }))
    .filter((p) => p.title && p.link)
}

async function collectSource(source) {
  if (source.type === 'rss') return collectRSS(source)
  if (source.type === 'html') return collectGitHubTrending(source)
  if (source.type === 'reddit_json') return collectRedditJSON(source)
  return []
}

// ────────────────────────────────────────────────
// 메인
// ────────────────────────────────────────────────
async function main() {
  console.log('🤖 AI NEWS — 뉴스 수집 시작')
  const sources = JSON.parse(readFileSync(SOURCES_PATH, 'utf-8'))

  // 1. 병렬 수집
  const results = await Promise.allSettled(
    sources.map((src) => collectSource(src).then((items) => ({ src, items }))),
  )

  // 2. 원시 기사 풀링 + 스코어링
  const seen = new Map()
  const rawArticles = []
  for (const res of results) {
    if (res.status !== 'fulfilled') {
      console.warn(`  ⚠️ [${res.reason?.message ?? '알 수 없는 오류'}]`)
      continue
    }
    const { src, items } = res.value
    console.log(`  ✅ ${src.name}: ${items.length}건`)
    for (const item of items) {
      if (!item.title || !item.link) continue
      const dupKey = item.title.toLowerCase().replace(/[^a-z0-9]/g, '')
      if (seen.has(dupKey)) continue
      seen.set(dupKey, true)

      const { score, tags } = scoreArticle(item.title, item.summary)
      const category = tags.size > 0 ? [...tags] : ['industry']

      rawArticles.push({
        id: makeId(item.title + item.link),
        title: item.title.slice(0, 200),
        summary: item.summary.slice(0, 400),
        url: item.link,
        source: item.source.name,
        sourceId: item.source.id,
        icon: item.source.icon ?? '📰',
        category,
        score,
        publishedAt: item.publishedAt ? new Date(item.publishedAt).toISOString() : new Date().toISOString(),
      })
    }
  }

  // 3. MIN_SCORE 미만 제외 → 스코어 내림차순 → 시간 내림차순
  const filtered = rawArticles
    .filter((a) => a.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || new Date(b.publishedAt) - new Date(a.publishedAt))
    .slice(0, MAX_ARTICLES)

  // 4. 메타 정보
  const now = new Date()
  const next = new Date(now)
  next.setUTCHours(next.getUTCHours() + INTERVAL_HOURS)
  next.setUTCMinutes(0, 0, 0) // 정각 정렬

  const payload = {
    generatedAt: now.toISOString(),
    nextUpdate: next.toISOString(),
    intervalHours: INTERVAL_HOURS,
    timezone: 'Asia/Seoul',
    totalCollected: rawArticles.length,
    articleCount: filtered.length,
    articles: filtered,
  }

  // 5. 저장
  mkdirSync(dirname(OUTPUT_PATH), { recursive: true })
  writeFileSync(OUTPUT_PATH, JSON.stringify(payload, null, 2), 'utf-8')
  console.log(`\n📦 완료: ${filtered.length}건 저장 → ${OUTPUT_PATH}`)
  const byCat = {}
  for (const a of filtered) for (const c of a.category) byCat[c] = (byCat[c] ?? 0) + 1
  console.log('   카테고리:', byCat)
}

main().catch((err) => {
  console.error('💥 치명적 오류:', err)
  process.exit(1)
})