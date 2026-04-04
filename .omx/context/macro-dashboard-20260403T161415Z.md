# Context Snapshot
- task statement: 경제 흐름 대시보드(국내/해외 지수, 원자재, 금리 등) 아이디어 및 요구사항 명확화
- desired outcome: 실행 가능한 요구사항 스펙(범위/비범위/성공기준/의사결정 경계 포함)
- stated solution: 한눈에 세계 경제 흐름을 보여주는 대시보드 구축
- probable intent hypothesis: 투자 판단 전에 거시 흐름을 빠르게 파악하고 싶음
- known facts/evidence: Next.js 앱, 기존에 /dashboard 페이지와 주식/섹터/포트폴리오 기능 존재
- constraints: 현재 데이터 소스 안정성/호출 제한/갱신주기 미정
- unknowns/open questions: 타깃 사용자, 핵심 KPI, 모바일 우선 여부, 실시간성 요구, 알림 필요성
- decision-boundary unknowns: OMX가 데이터 소스/차트 라이브러리/캐시 정책을 자율 결정해도 되는 범위 미정
- likely codebase touchpoints: src/app/dashboard/page.tsx, src/components/market/*, src/lib/api/*, src/types/market.ts
