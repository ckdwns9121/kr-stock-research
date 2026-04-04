# 국내 주식 리서치 (kr-stock-research)

국내 주식 정보를 한눈에 볼 수 있는 웹 애플리케이션입니다. 주가, 재무제표, 뉴스, 시장 지수를 한 곳에서 확인할 수 있습니다.

## 주요 기능

- **주식 검색** — 종목명 또는 티커로 검색
- **주식 상세 페이지** — 주가 차트, 재무 지표(PER/PBR/ROE), 재무제표, 관련 뉴스
- **시장 개요** — KOSPI/KOSDAQ 실시간 지수
- **뉴스 피드** — 주요 시장 뉴스 모음
- **대시보드** — 거시 경제 지표 (환율, 금리, 원자재 등)
- **섹터 분석** — 업종별 주식 현황
- **포트폴리오** — 관심 종목 관리 (로컬 저장)

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 차트 | lightweight-charts |
| 데이터 파싱 | cheerio |

## 데이터 소스

- **네이버 금융** — 주가, PER/PBR, 차트 데이터, 뉴스, KOSPI/KOSDAQ 지수 (HTML 스크래핑, euc-kr 인코딩 처리)
- **DART OpenAPI** — 재무제표 (손익계산서, 재무상태표) — 공식 API 키 필요
- **KRX** — 종목 코드 매핑 (`src/data/corp-codes.json`)

## 시작하기

### 요구사항

- Node.js 18+
- DART OpenAPI 키 ([dart.fss.or.kr](https://opendart.fss.or.kr/) 에서 발급)

### 설치

```bash
git clone https://github.com/ckdwns9121/kr-stock-research.git
cd kr-stock-research
npm install
```

### 환경 변수 설정

```bash
cp .env.example .env.local
```

`.env.local` 파일에 DART API 키를 입력합니다:

```env
DART_API_KEY=your_dart_api_key_here
```

### 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 에 접속합니다.

### 빌드

```bash
npm run build
npm start
```

## 프로젝트 구조

```
src/
├── app/                    # Next.js App Router 페이지 및 API 라우트
│   ├── api/                # Route Handlers (스크래핑 래퍼)
│   ├── stock/[ticker]/     # 주식 상세 페이지
│   ├── dashboard/          # 거시 경제 대시보드
│   ├── sectors/            # 섹터 분석
│   ├── news/               # 뉴스 피드
│   └── portfolio/          # 포트폴리오
├── components/             # React 컴포넌트 (도메인별 분류)
├── lib/
│   └── api/                # 데이터 소스별 스크래핑 모듈
│       ├── client.ts       # fetch 유틸 (타임아웃, SWR 캐시)
│       ├── naver.ts        # 네이버 금융 스크래퍼
│       ├── dart.ts         # DART 재무제표 API
│       └── krx.ts          # KRX 종목 목록
├── types/                  # TypeScript 타입 정의
├── hooks/                  # 커스텀 훅
└── data/
    └── corp-codes.json     # 티커 ↔ DART corp_code 매핑
```

## 아키텍처 특징

- 모든 외부 데이터 요청은 **서버 사이드**에서 처리 (클라이언트에 API 키 노출 없음)
- `Promise.allSettled`로 병렬 데이터 패칭 — 하나 실패해도 나머지 정상 표시
- 인메모리 stale-while-revalidate 캐시 (최대 500개 항목)
- API 실패 시 `null` / `[]` 반환으로 UI graceful degradation
- Next.js ISR: 뉴스 120s, 주가 300s, 재무제표 3600s 재검증

## 라이선스

MIT
