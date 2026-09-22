# 🗞️ AI NEWS — 12시간 브리핑

> 오픈소스 & 신형 AI 뉴스를 하루 2번(12시간 간격) 자동으로 브리핑해주는 PWA 웹 앱
> 스마트폰 홈 화면에 설치하면 앱처럼 사용할 수 있어요.

![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-Installable-5a0fc8)

## ✨ 기능

- **12시간 자동 브리핑** — 한국시간 매일 09:00 / 21:00에 뉴스 자동 갱신
- **AI 뉴스 선별** — 7개 소스에서 수집 후, 오픈소스/신형모델/업계 키워드 스코어링으로 상위 60건 제공
- **카테고리 탭** — 전체 / 오픈소스 🟢 / 신형모델 🚀 / 업계 🏢
- **한국어 번역 버튼** — 영문 뉴스를 원터치로 한국어 번역 (MyMemory 무료 API)
- **오프라인 지원** — Service Worker가 최신 뉴스 스냅샷을 캐시
- **다크모드 / 라이트모드** — 시스템 테마 자동 대응
- **읽음 표시 / 관련도 점수 / 당겨서 새로고침**

## 🏗️ 아키텍처 (무서버)

```
GitHub Actions (cron 12h)
        │  node scripts/fetch-news.mjs
        ▼
  public/data/news.json  ← ── 커밋
        │  push 트리거
        ▼
GitHub Pages (자동 배포)
        │  same-origin fetch (CORS 없음)
        ▼
📱 PWA (React 19 + Vite 8 + TS)
```

- 뉴스 수집: `actions/checkout` + `setup-node` + `npm ci` 후 `node scripts/fetch-news.mjs`
- 배포: `actions/deploy-pages` (GitHub Pages, `/ai-news/` 경로)

## 📡 뉴스 소스

| 소스 | 유형 | 아이콘 |
|---|---|---|
| Hugging Face Blog | RSS | 🤗 |
| arXiv cs.AI | RSS | 📄 |
| Hacker News (AI 검색) | RSS | 🐝 |
| The Decoder | RSS | 🔍 |
| Simon Willison's blog | RSS | 🧪 |
| Google AI Blog | RSS | 🔬 |
| GitHub Trending | HTML | ⭐ |

## 🛠️ 로컬 개발

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm run fetch-news # 뉴스 수동 수집 → public/data/news.json
npm run build      # tsc + vite build + 서비스워커 생성
npm run preview    # 프로덕션 빌드 미리보기
```

## 📱 스마트폰 설치

1. 배포된 사이트 접속 (GitHub Pages 주소)
2. 브라우저 메뉴 → **"홈 화면에 추가"** (iOS: 공유 → 홈 화면에 추가)
3. 설치 완료! 앱처럼 사용

## 🔄 뉴스 갱신 주기

- `fetch-news.yml` — 매일 **UTC 00:00 / 12:00 (= KST 09:00 / 21:00)** 뉴스 수집 후 커밋
- `deploy.yml` — push마다 자동으로 Pages 배포
- 수동 실행: Actions 탭 → **fetch-news** → **Run workflow**

## 📁 프로젝트 구조

```
ai-news/
├── .github/workflows/
│   ├── fetch-news.yml   # 12시간 뉴스 수집 (cron)
│   └── deploy.yml       # GitHub Pages 배포
├── scripts/
│   ├── sources.json     # 뉴스 소스 설정
│   ├── fetch-news.mjs   # 수집기 (RSS + HTML 스크랩 + 스코어링)
│   ├── gen-icons.mjs    # PWA 아이콘 생성 (sharp)
│   └── gen-sw.mjs       # Service Worker 자동 생성
├── public/
│   ├── data/news.json   # 수집 결과 (커밋 대상)
│   ├── icons/           # PWA 아이콘
│   └── manifest.webmanifest
└── src/
    ├── components/      # NewsCard, CategoryTabs, BriefingBadge
    ├── hooks/           # useNews, useNow, useArticles
    ├── lib/             # newsApi, translate, storage
    └── App.tsx
```

## 📄 라이선스

MIT