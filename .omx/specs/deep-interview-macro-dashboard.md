# Deep Interview Spec — Macro Dashboard

## Metadata
- profile: standard
- rounds: 7
- final_ambiguity: 0.18
- threshold: 0.20
- context_type: brownfield
- context_snapshot_path: `.omx/context/macro-dashboard-20260403T161415Z.md`
- transcript_path: `.omx/interviews/macro-dashboard-20260403T161900Z.md`

## Clarity Breakdown
| Dimension | Score |
|---|---:|
| Intent | 0.90 |
| Outcome | 0.88 |
| Scope | 0.84 |
| Constraints | 0.82 |
| Success | 0.86 |
| Context | 0.84 |

## Intent (Why)
사용자가 매일 시장 시작/중간 시점에 거시+시황을 빠르게 스캔해, 오늘 시장이 Risk-on/Risk-off인지와 강약 섹터를 즉시 판단하려는 목적.

## Desired Outcome
코스피/코스닥/나스닥 등 주요 지수, 원자재/금리, 섹터 강약, 주도주, 핵심 뉴스를 한 화면에서 확인 가능한 대시보드.

## In Scope (v1)
1. 글로벌/국내 주요 지수 카드 (코스피, 코스닥, 나스닥 포함)
2. 거시 지표 카드 (금리/원자재/유가 중심)
3. 섹터 강약 뷰 (상승/하락 섹터 식별)
4. 이번 주도주/강세 종목 하이라이트
5. 주요 뉴스 요약 영역
6. 준실시간 갱신(1~5분)
7. 정보 밀도는 높되 화면은 깔끔한 레이아웃

## Out of Scope / Non-goals
- 자동매매 신호
- 사용자 커뮤니티 기능
- 실시간 틱차트

## Decision Boundaries (OMX 자율 결정 가능 범위)
- 데이터 소스: 네이버 계열 우선(핵심 방향 고정)
- 갱신 전략: 준실시간(1~5분) 범위 내 구현 방식은 자율
- UI 세부 배치/카드 정렬/탭 구조: "깔끔함" 원칙 하 자율

## Constraints
- 실시간 틱차트 없이도 시황 판단이 가능해야 함
- 기존 brownfield 구조(`/dashboard`, `components/market`, `lib/api`)와 충돌 없이 확장
- 외부 소스 호출 실패 시에도 전체 화면이 깨지지 않도록 부분 실패 허용

## Testable Acceptance Criteria
1. `/dashboard` 진입 시 주요 지수/거시/섹터/뉴스/주도주 영역이 모두 표시된다.
2. 데이터 갱신 타임스탬프가 표시되며, 최대 5분 내 갱신 상태를 유지한다.
3. 사용자는 30초 내에 다음 3가지를 답할 수 있다:
   - 오늘 시장이 Risk-on인지 Risk-off인지
   - 강한 섹터 1개
   - 약한 섹터 1개
4. 하나 이상의 데이터 소스 장애가 발생해도 나머지 카드들은 렌더링된다.
5. 빌드/타입체크가 성공한다.

## Assumptions Exposed + Resolutions
- 가정: “실시간”이 초단위여야 유효하다 → 해소: v1은 준실시간(1~5분)으로 확정
- 가정: 성공기준은 정량 지표가 필수다 → 해소: 사용자 행동기준(30초 판단 가능)으로 합의

## Pressure-pass Findings
- 재질문 대상: 성공기준 정의
- 변화: 숫자 KPI 중심 질문에서 사용자 가치 중심 기준(30초 판단 가능)으로 정렬

## Brownfield Evidence vs Inference
- Evidence: `src/app/dashboard`, `src/components/market/*` 존재
- Inference: 기존 대시보드 위에 확장하는 형태가 가장 리스크 낮음

## Handoff Recommendation
1순위: `$ralplan` → 합의형 실행계획/테스트 스펙 확정
2순위: `$ralph` → 계획 승인 후 구현+검증 루프
