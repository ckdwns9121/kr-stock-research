# Context Snapshot
- task statement: 거시 지표 미노출 문제 해결 + 섹터를 더 넓게 표시
- desired outcome: 대시보드 거시지표 카드가 실제 데이터 표시, 섹터 카드가 3개 이상(확장 섹터) 표시
- known facts/evidence: macro.ts에서 Naver world code 파싱 실패 가능; sectors.ts 현재 3개 섹터만 정의
- constraints: Naver first 정책 유지, fallback 허용, non-goals 유지
- unknowns/open questions: 사용자 의도의 정확한 '모든 섹터' 범위(업종 전부 vs 확장 preset)
- likely codebase touchpoints: src/lib/dashboard/macro.ts, src/lib/sectors.ts, src/app/dashboard/page.tsx
