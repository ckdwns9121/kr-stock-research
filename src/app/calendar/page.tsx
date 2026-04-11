import type { Metadata } from "next";
import { CalendarTabs } from "@/components/calendar/CalendarTabs";

export const metadata: Metadata = {
  title: "경제 캘린더 - 주식리서치",
  description: "FOMC, CPI, 한은 금통위 등 주요 경제 이벤트 일정을 확인하세요.",
};

export interface EconomicEvent {
  name: string;
  country: "KR" | "US";
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM (현지 시간)
  importance: "high" | "medium";
  description: string;
  icon: string;
  previous?: string; // 이전 발표치
  forecast?: string; // 예상치
}

const ECONOMIC_EVENTS: EconomicEvent[] = [
  // 2026년 미국 주요 일정
  { name: "FOMC 금리 결정", country: "US", date: "2026-01-28", time: "14:00", importance: "high", icon: "🇺🇸", description: "미 연방공개시장위원회 기준금리 결정", previous: "4.50%", forecast: "4.25%" },
  { name: "비농업 고용지표 (NFP)", country: "US", date: "2026-02-06", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 1월 비농업 부문 신규 고용자 수", previous: "256K", forecast: "170K" },
  { name: "CPI 소비자물가", country: "US", date: "2026-02-12", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 1월 소비자물가 변동률 (YoY)", previous: "2.9%", forecast: "2.8%" },
  { name: "PPI 생산자물가", country: "US", date: "2026-02-13", time: "08:30", importance: "medium", icon: "🇺🇸", description: "미국 1월 생산자물가 변동률", previous: "3.3%" },
  { name: "PCE 물가지수", country: "US", date: "2026-02-28", time: "08:30", importance: "high", icon: "🇺🇸", description: "연준 선호 인플레 지표 (1월)", previous: "2.6%" },
  { name: "비농업 고용지표 (NFP)", country: "US", date: "2026-03-06", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 2월 비농업 부문 신규 고용자 수" },
  { name: "CPI 소비자물가", country: "US", date: "2026-03-11", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 2월 소비자물가 변동률 (YoY)" },
  { name: "FOMC 금리 결정", country: "US", date: "2026-03-18", time: "14:00", importance: "high", icon: "🇺🇸", description: "미 연방공개시장위원회 기준금리 결정 + 점도표" },
  { name: "PCE 물가지수", country: "US", date: "2026-03-27", time: "08:30", importance: "high", icon: "🇺🇸", description: "연준 선호 인플레 지표 (2월)" },
  { name: "비농업 고용지표 (NFP)", country: "US", date: "2026-04-03", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 3월 비농업 부문 신규 고용자 수" },
  { name: "CPI 소비자물가", country: "US", date: "2026-04-14", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 3월 소비자물가 변동률 (YoY)" },
  { name: "PCE 물가지수", country: "US", date: "2026-04-30", time: "08:30", importance: "high", icon: "🇺🇸", description: "연준 선호 인플레 지표 (3월)" },
  { name: "FOMC 금리 결정", country: "US", date: "2026-05-06", time: "14:00", importance: "high", icon: "🇺🇸", description: "미 연방공개시장위원회 기준금리 결정" },
  { name: "CPI 소비자물가", country: "US", date: "2026-05-12", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 4월 소비자물가 변동률 (YoY)" },
  { name: "비농업 고용지표 (NFP)", country: "US", date: "2026-05-08", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 4월 비농업 부문 신규 고용자 수" },
  { name: "FOMC 금리 결정", country: "US", date: "2026-06-17", time: "14:00", importance: "high", icon: "🇺🇸", description: "미 연방공개시장위원회 기준금리 결정 + 점도표" },
  { name: "CPI 소비자물가", country: "US", date: "2026-06-10", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 5월 소비자물가 변동률 (YoY)" },
  { name: "FOMC 금리 결정", country: "US", date: "2026-07-29", time: "14:00", importance: "high", icon: "🇺🇸", description: "미 연방공개시장위원회 기준금리 결정" },
  { name: "GDP 성장률 (속보)", country: "US", date: "2026-04-29", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 2026년 1분기 GDP 성장률 속보치" },
  { name: "GDP 성장률 (속보)", country: "US", date: "2026-07-29", time: "08:30", importance: "high", icon: "🇺🇸", description: "미국 2026년 2분기 GDP 성장률 속보치" },

  // 2026년 한국 주요 일정
  { name: "한은 금통위", country: "KR", date: "2026-01-16", time: "10:00", importance: "high", icon: "🇰🇷", description: "한국은행 금융통화위원회 기준금리 결정", previous: "3.00%", forecast: "2.75%" },
  { name: "수출입 동향", country: "KR", date: "2026-02-01", importance: "medium", icon: "🇰🇷", description: "2026년 1월 수출입 실적" },
  { name: "한은 금통위", country: "KR", date: "2026-02-27", time: "10:00", importance: "high", icon: "🇰🇷", description: "한국은행 금융통화위원회 기준금리 결정" },
  { name: "수출입 동향", country: "KR", date: "2026-03-01", importance: "medium", icon: "🇰🇷", description: "2026년 2월 수출입 실적" },
  { name: "CPI 소비자물가", country: "KR", date: "2026-03-03", importance: "medium", icon: "🇰🇷", description: "한국 2월 소비자물가 변동률" },
  { name: "한은 금통위", country: "KR", date: "2026-04-09", time: "10:00", importance: "high", icon: "🇰🇷", description: "한국은행 금융통화위원회 기준금리 결정" },
  { name: "수출입 동향", country: "KR", date: "2026-04-01", importance: "medium", icon: "🇰🇷", description: "2026년 3월 수출입 실적" },
  { name: "CPI 소비자물가", country: "KR", date: "2026-04-02", importance: "medium", icon: "🇰🇷", description: "한국 3월 소비자물가 변동률" },
  { name: "GDP 성장률", country: "KR", date: "2026-04-23", importance: "high", icon: "🇰🇷", description: "한국 2026년 1분기 GDP 성장률 속보치" },
  { name: "수출입 동향", country: "KR", date: "2026-05-01", importance: "medium", icon: "🇰🇷", description: "2026년 4월 수출입 실적" },
  { name: "한은 금통위", country: "KR", date: "2026-05-28", time: "10:00", importance: "high", icon: "🇰🇷", description: "한국은행 금융통화위원회 기준금리 결정" },
  { name: "수출입 동향", country: "KR", date: "2026-06-01", importance: "medium", icon: "🇰🇷", description: "2026년 5월 수출입 실적" },
  { name: "한은 금통위", country: "KR", date: "2026-07-09", time: "10:00", importance: "high", icon: "🇰🇷", description: "한국은행 금융통화위원회 기준금리 결정" },
  { name: "GDP 성장률", country: "KR", date: "2026-07-23", importance: "high", icon: "🇰🇷", description: "한국 2026년 2분기 GDP 성장률 속보치" },
  { name: "한은 금통위", country: "KR", date: "2026-08-27", time: "10:00", importance: "high", icon: "🇰🇷", description: "한국은행 금융통화위원회 기준금리 결정" },
  { name: "한은 금통위", country: "KR", date: "2026-10-15", time: "10:00", importance: "high", icon: "🇰🇷", description: "한국은행 금융통화위원회 기준금리 결정" },
  { name: "한은 금통위", country: "KR", date: "2026-11-26", time: "10:00", importance: "high", icon: "🇰🇷", description: "한국은행 금융통화위원회 기준금리 결정" },
];

export default function CalendarPage() {
  return (
    <div className="space-y-6">
      <section>
        <h1 className="text-2xl font-bold text-dark-text-primary">경제 캘린더</h1>
        <p className="text-sm text-dark-text-secondary mt-1">주요 한국·미국 경제 이벤트 일정과 D-day를 확인하세요</p>
      </section>

      <CalendarTabs events={ECONOMIC_EVENTS} />
    </div>
  );
}
