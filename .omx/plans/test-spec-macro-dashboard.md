# Test Spec — Macro Dashboard v1

## 목표
PRD의 핵심 목표(30초 판단 가능성, 강한 정보 위계, 준실시간, 부분 실패 허용)를 검증한다.

## 테스트 범위
- `/dashboard` 정보 위계 렌더링
- summary 요소 완전성
- 카드 상태(fresh/stale/unavailable)
- last updated 표시
- 카드군별 TTL 정책
- 섹터 강약 산출 규칙
- 부분 실패 degrade
- 30초 수동 QA
- 반응형(모바일/노트북) 정보 과밀

## 사전 조건
- 개발 서버 또는 빌드 가능한 상태
- 대시보드 데이터 API 접근 가능
- 실패 주입(특정 카드 fetch 실패) 가능한 환경

## 테스트 케이스

### TC-01 정보 위계 렌더링
- Given `/dashboard` 접속
- Then 상단(summary) / 중단(evidence) / 하단(support) 3단 구조가 보인다.

### TC-02 Summary 필수 4요소
- Then summary에 아래 4개가 모두 있어야 한다:
  1) Risk-on/off
  2) 강한 섹터 1개
  3) 약한 섹터 1개
  4) 한줄 요약

### TC-03 근거 영역 완전성
- Then 중단 영역에 주요 지수, 거시, 섹터 카드가 존재한다.

### TC-04 보조 영역 완전성
- Then 하단 영역에 주도주, 뉴스 카드가 존재한다.

### TC-05 상태/타임스탬프
- Then 각 카드(또는 카드군)는 상태(fresh/stale/unavailable)와 last updated 표시를 제공한다.

### TC-06 TTL 분리 정책
- Verify 카드군별 TTL이 분리되어 설정/적용된다.
  - summary: 3~5m
  - 지수/섹터: 1~3m
  - 거시: 5~15m
  - 뉴스: 10~30m

### TC-07 섹터 강약 산출
- Verify score 공식이 구현/문서와 일치한다:
  - sector_score = 평균등락률*0.7 + 상승종목비율*0.3
- Verify 동률 tie-break 규칙이 적용된다.

### TC-08 부분 실패 degrade
- Given 특정 데이터 소스 실패 주입
- Then 실패 카드만 unavailable 또는 stale로 표시되고, 페이지 전체는 정상 동작한다.

### TC-09 30초 수동 QA 프로토콜
- 절차:
  1) 테스트어가 `/dashboard` 첫 진입 후 30초만 관찰
  2) 다음 3문항 답변
     - 오늘 시장은 Risk-on인가 Risk-off인가?
     - 강한 섹터 1개?
     - 약한 섹터 1개?
- 통과 기준: 3문항 모두 답변 가능

### TC-10 반응형 과밀 검증
- 모바일: first viewport에서 summary 해석 가능
- 노트북: 상/중/하 위계가 시각적으로 유지

### TC-11 비범위 준수
- 자동매매 신호/커뮤니티/실시간 틱차트 UI/기능이 존재하지 않는다.

### TC-12 기술 검증
- `npm run build` 통과
- `npx tsc --noEmit` 통과
- (가능 시) `npm run lint` 통과

## 실패 기준
- summary 4요소 중 하나라도 누락
- 부분 실패 시 전체 페이지 붕괴
- 상태/last updated 미표시
- 30초 프로토콜 불합격

## 리포팅 포맷
- 케이스 ID
- 결과(PASS/FAIL)
- 증거(스크린샷/로그/터미널 출력)
- 이슈 심각도
- 재현 절차
