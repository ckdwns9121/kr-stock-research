# PRD — Macro Dashboard v1

## 배경 / 목적
사용자가 `/dashboard`를 30초만 봐도 **오늘 시장이 Risk-on/Risk-off인지**, **강한 섹터 1개/약한 섹터 1개**를 즉시 판단할 수 있는 거시+시황 통합 대시보드를 제공한다.

## 범위 (In Scope)
1. 상단 **오늘의 해석** 영역
   - Risk-on/Risk-off 판정
   - 강한 섹터 1개
   - 약한 섹터 1개
   - 한줄 요약
2. 중단 **해석 근거** 영역
   - 주요 지수(코스피/코스닥/나스닥 포함)
   - 거시 지표(금리/유가/원자재)
   - 섹터 강약
3. 하단 **보조 정보** 영역
   - 주도주
   - 주요 뉴스
4. 준실시간 갱신(카드군별 TTL 분리)
5. 부분 실패 허용 UI
   - fresh/stale/unavailable 상태
   - last updated 표시

## 비범위 (Out of Scope)
- 자동매매 신호
- 사용자 커뮤니티
- 실시간 틱차트

## 결정 경계
- 데이터 소스 정책: **Naver first, not Naver only**
  - 네이버 우선 사용
  - 네이버 미지원/불안정 항목에 한해 제한적 보완 소스 허용
- 레이아웃 세부 구현은 “깔끔함 + 위계 보존” 원칙 하에서 자율 결정

## 핵심 원칙
1. 해석 우선(요약 먼저, 데이터는 근거)
2. 단일 페이지 + 강한 정보 위계
3. 준실시간 + 안정성 우선
4. 부분 실패 시에도 전체 화면 유지

## 정보 구조
- 상단: Summary (해석)
- 중단: Evidence (지수/거시/섹터)
- 하단: Support (주도주/뉴스)

## 데이터 정책
### 카드 상태
- `fresh`: TTL 이내 최신
- `stale`: 최신 fetch 실패, 마지막 성공 데이터 유지
- `unavailable`: 데이터 사용 불가

### 카드군별 TTL (v1)
- Summary: 3~5분
- 지수/섹터: 1~3분
- 거시(금리/유가/원자재): 5~15분
- 뉴스: 10~30분

### 섹터 강약 산출
- 기본 공식: `sector_score = 평균등락률 * 0.7 + 상승종목비율 * 0.3`
- Strong sector: 최고 score
- Weak sector: 최저 score
- 동률 tie-break: 평균 거래대금(또는 사전 정의 보조 지표)

## 사용자 스토리
### US-001: 30초 판단 요약
- As a 사용자, I want 상단 요약에서 오늘 시장 체온과 강약 섹터를 즉시 파악하고 싶다.

### US-002: 해석 근거 확인
- As a 사용자, I want 지수/거시/섹터 근거를 확인해 요약의 타당성을 검토하고 싶다.

### US-003: 보조 정보 참조
- As a 사용자, I want 주도주/뉴스를 함께 봐서 오늘 흐름을 보완적으로 이해하고 싶다.

### US-004: 장애 내성
- As a 사용자, I want 일부 데이터 실패 시에도 나머지 대시보드를 계속 사용할 수 있기를 원한다.

## 수용 기준 (AC)
1. `/dashboard` 상단에 summary 영역이 존재한다.
2. summary에 Risk 판정/강섹터/약섹터/한줄요약 4요소가 존재한다.
3. 중단 영역에 지수/거시/섹터 근거 카드가 존재한다.
4. 하단 영역에 주도주/뉴스 카드가 존재한다.
5. 각 카드/카드군은 fresh/stale/unavailable 및 last updated를 표현한다.
6. 카드군별 TTL 정책이 코드/구성에 반영된다.
7. 섹터 강약은 명시 공식으로 산출된다.
8. 일부 fetch 실패 시 실패 카드만 degrade되고 전체 페이지는 유지된다.
9. 30초 수동 QA에서 테스트 수행자가 Risk 판정 + 강/약 섹터를 답할 수 있다.
10. 비범위 기능(자동매매/커뮤니티/틱차트)은 구현하지 않는다.
11. build/typecheck가 통과한다.

## ADR
### Decision
Option A' (단일 페이지 + 강한 위계형) 채택

### Drivers
- 30초 판단 가능성
- 안정성/부분 실패 내성
- 브라운필드 확장 효율

### Alternatives
- 탭형 분리(Option B)
- 요약 허브형(Option C)

### Why Chosen
즉시 해석성과 구현 현실성의 균형이 가장 좋음.

### Consequences
- Summary 품질 규칙이 핵심
- 상태/TTL 관리 복잡성 증가
- 과밀 제어 UX 중요

### Follow-ups
- v2: 개인화/알림/탭 분리 검토
- fallback source adapter 확장

## Available agent types roster
- planner, architect, critic
- executor, debugger, verifier, test-engineer
- designer, writer, explore

## 실행 제안
- 순차 실행: `$ralph .omx/specs/deep-interview-macro-dashboard.md`
- 병렬 실행: `$team .omx/specs/deep-interview-macro-dashboard.md`
