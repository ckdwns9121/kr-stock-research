import type { Metadata } from "next";
import { CalendarTabs } from "@/components/calendar/CalendarTabs";

export const metadata: Metadata = {
  title: "경제 캘린더 - 주식리서치",
  description: "FOMC, CPI, 한은 금통위 등 주요 경제 이벤트 일정을 확인하세요.",
};

interface EconomicEvent {
  name: string;
  country: "KR" | "US";
  frequency: string;
  importance: "high" | "medium";
  description: string;
  icon: string;
}

const ECONOMIC_EVENTS: EconomicEvent[] = [
  {
    name: "FOMC 금리 결정",
    country: "US",
    frequency: "6주마다",
    importance: "high",
    description: "미 연방공개시장위원회의 기준금리 결정. 글로벌 자금 흐름과 달러 강세에 직접 영향을 미치는 최중요 이벤트.",
    icon: "🇺🇸",
  },
  {
    name: "CPI 소비자물가지수",
    country: "US",
    frequency: "월간",
    importance: "high",
    description: "미국 소비자물가 변동률. FOMC 금리 결정의 핵심 근거로 사용되며 인플레이션 추세를 파악할 수 있는 지표.",
    icon: "🇺🇸",
  },
  {
    name: "비농업 고용지표 (NFP)",
    country: "US",
    frequency: "월간",
    importance: "high",
    description: "미국 비농업 부문 신규 고용자 수. 경기 강도와 소비 여력을 나타내며 연준 통화정책 판단의 핵심 변수.",
    icon: "🇺🇸",
  },
  {
    name: "PPI 생산자물가지수",
    country: "US",
    frequency: "월간",
    importance: "medium",
    description: "공장·농장 출하 단계의 물가 변동. CPI보다 선행하는 경향이 있어 인플레이션 방향성을 미리 가늠할 수 있는 지표.",
    icon: "🇺🇸",
  },
  {
    name: "GDP 성장률",
    country: "US",
    frequency: "분기",
    importance: "high",
    description: "미국의 분기별 경제성장률(속보·잠정·확정치 3차 발표). 경기 사이클 판단의 기준이 되는 최상위 거시 지표.",
    icon: "🇺🇸",
  },
  {
    name: "PCE 물가지수",
    country: "US",
    frequency: "월간",
    importance: "high",
    description: "연준이 가장 중시하는 인플레이션 지표. CPI보다 소비 패턴 변화를 폭넓게 반영해 통화정책 기준으로 활용.",
    icon: "🇺🇸",
  },
  {
    name: "한은 금통위",
    country: "KR",
    frequency: "연 8회",
    importance: "high",
    description: "한국은행 금융통화위원회의 기준금리 결정. 국내 대출금리·채권·부동산 시장에 직접 영향을 미치는 핵심 이벤트.",
    icon: "🇰🇷",
  },
  {
    name: "수출입 동향",
    country: "KR",
    frequency: "월간",
    importance: "medium",
    description: "한국의 월별 수출입 금액 및 증감률. 반도체·자동차 등 주력 품목의 경기 방향을 선행적으로 확인할 수 있는 지표.",
    icon: "🇰🇷",
  },
  {
    name: "CPI 소비자물가지수",
    country: "KR",
    frequency: "월간",
    importance: "medium",
    description: "국내 소비자물가 변동률. 한은 금통위 금리 결정의 주요 근거로 국내 인플레이션 수준을 나타내는 지표.",
    icon: "🇰🇷",
  },
  {
    name: "GDP 성장률",
    country: "KR",
    frequency: "분기",
    importance: "high",
    description: "한국의 분기별 경제성장률. 내수·수출 경기를 종합적으로 반영하며 국내 경기 사이클 판단의 기준이 되는 지표.",
    icon: "🇰🇷",
  },
];

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-dark-text-primary">경제 캘린더</h1>
        <p className="text-sm text-dark-text-secondary mt-1">주요 경제 이벤트 일정</p>
      </section>

      <CalendarTabs events={ECONOMIC_EVENTS} />
    </div>
  );
}
