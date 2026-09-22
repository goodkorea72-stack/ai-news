// PWA 아이콘 생성 — sharp로 SVG를 PNG로 래스터화
// 사용: node scripts/gen-icons.mjs
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '..', 'public', 'icons')
mkdirSync(OUT_DIR, { recursive: true })

// ── SVG 템플릿 ────────────────────────────────
// maskable: 배경 전체 채움(rx=0), any: 둥근 모서리(rx)
function robotSvg({ size = 512, rounded = true, safeZone = false }) {
  const headW = size * 0.46
  const headH = size * 0.31
  const headX = (size - headW) / 2
  const headY = size * 0.33
  const eyeSize = headW * 0.22
  const eyeY = headY + headH * 0.38
  const eyeLX = headX + headW * 0.18
  const eyeRX = headX + headW * 0.6
  // 마우스는 head 안쪽에 유지 (maskable safe zone = 중앙 80%)
  const mouthW = headW * 0.32
  const mouthY = headY + headH * 0.72

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1a3b8f"/>
      <stop offset="55%" stop-color="#5b4dd6"/>
      <stop offset="100%" stop-color="#8a3fd6"/>
    </linearGradient>
    <linearGradient id="head" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#dfe6ff"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${rounded ? size * 0.21 : 0}" fill="url(#bg)"/>
  <rect x="${headX}" y="${headY}" width="${headW}" height="${headH}" rx="${headW * 0.2}" fill="url(#head)"/>
  <circle cx="${size / 2}" cy="${headY - size * 0.02}" r="${size * 0.07}" fill="#fbbf24"/>
  <rect x="${eyeLX}" y="${eyeY}" width="${eyeSize}" height="${eyeSize}" rx="${eyeSize * 0.28}" fill="#1a3b8f"/>
  <rect x="${eyeRX}" y="${eyeY}" width="${eyeSize}" height="${eyeSize}" rx="${eyeSize * 0.28}" fill="#1a3b8f"/>
  <rect x="${headX + (headW - mouthW) / 2}" y="${mouthY}" width="${mouthW}" height="${headH * 0.08}" rx="${headH * 0.04}" fill="#8ab4ff"/>
</svg>`
}

const targets = [
  { file: 'icon-192.png', size: 192, rounded: true },
  { file: 'icon-512.png', size: 512, rounded: true },
  { file: 'maskable-192.png', size: 192, rounded: false },
  { file: 'maskable-512.png', size: 512, rounded: false },
  { file: 'apple-touch-icon.png', size: 180, rounded: false },
]

for (const t of targets) {
  const svg = Buffer.from(robotSvg({ size: 512, rounded: t.rounded }))
  await sharp(svg)
    .resize(t.size, t.size)
    .png({ compressionLevel: 9 })
    .toFile(join(OUT_DIR, t.file))
  console.log(`  ✅ ${t.file} (${t.size}x${t.size})`)
}

console.log(`📦 완료: ${targets.length}개 아이콘 → public/icons/`)