"use client";

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/Card";

interface EconomicEvent {
  name: string;
  country: "KR" | "US";
  date: string;
  time?: string;
  importance: "high" | "medium";
  description: string;
  icon: string;
  previous?: string;
  forecast?: string;
}

type CountryFilter = "all" | "US" | "KR";
type TimeFilter = "upcoming" | "thisWeek" | "thisMonth" | "past";

const COUNTRY_TABS: { key: CountryFilter; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "US", label: "🇺🇸 미국" },
  { key: "KR", label: "🇰🇷 한국" },
];

const TIME_TABS: { key: TimeFilter; label: string }[] = [
  { key: "upcoming", label: "예정" },
  { key: "thisWeek", label: "이번 주" },
  { key: "thisMonth", label: "이번 달" },
  { key: "past", label: "지난 이벤트" },
];

function getDday(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDday(dday: number): string {
  if (dday === 0) return "오늘";
  if (dday === 1) return "내일";
  if (dday > 0) return `D-${dday}`;
  return `D+${Math.abs(dday)}`;
}

function getDdayColor(dday: number): string {
  if (dday === 0) return "bg-toss-red text-white";
  if (dday === 1) return "bg-toss-red/80 text-white";
  if (dday <= 3) return "bg-toss-red/20 text-toss-red";
  if (dday <= 7) return "bg-yellow-500/20 text-yellow-400";
  if (dday > 0) return "bg-dark-elevated text-dark-text-secondary";
  return "bg-dark-elevated text-dark-text-muted";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const weekdays = ["일", "월", "화", "수", "목", "금", "토"];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const weekday = weekdays[d.getDay()];
  return `${month}/${day} (${weekday})`;
}

function isThisWeek(dateStr: string): boolean {
  const today = new Date();
  const target = new Date(dateStr);
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);
  return target >= startOfWeek && target < endOfWeek;
}

function isThisMonth(dateStr: string): boolean {
  const today = new Date();
  const target = new Date(dateStr);
  return target.getFullYear() === today.getFullYear() && target.getMonth() === today.getMonth();
}

interface CalendarTabsProps {
  events: EconomicEvent[];
}

export function CalendarTabs({ events }: CalendarTabsProps) {
  const [countryFilter, setCountryFilter] = useState<CountryFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("upcoming");

  const filtered = useMemo(() => {
    let result = events;

    if (countryFilter !== "all") {
      result = result.filter((e) => e.country === countryFilter);
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    switch (timeFilter) {
      case "upcoming":
        result = result.filter((e) => new Date(e.date) >= now);
        result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "thisWeek":
        result = result.filter((e) => isThisWeek(e.date));
        result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "thisMonth":
        result = result.filter((e) => isThisMonth(e.date));
        result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        break;
      case "past":
        result = result.filter((e) => new Date(e.date) < now);
        result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        break;
    }

    return result;
  }, [events, countryFilter, timeFilter]);

  const nextEvent = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const upcoming = events
      .filter((e) => new Date(e.date) >= now)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return upcoming[0] ?? null;
  }, [events]);

  return (
    <div className="space-y-4">
      {/* 다음 이벤트 하이라이트 */}
      {nextEvent && (
        <Card className="border border-toss-blue/20">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{nextEvent.icon}</span>
            <div className="flex-1">
              <p className="text-xs text-toss-blue font-semibold mb-0.5">다음 주요 이벤트</p>
              <p className="text-sm font-bold text-dark-text-primary">{nextEvent.name}</p>
              <p className="text-xs text-dark-text-secondary mt-0.5">
                {formatDate(nextEvent.date)}
                {nextEvent.time && ` ${nextEvent.time}`}
              </p>
            </div>
            <span className={`px-3 py-1.5 rounded-xl text-sm font-bold ${getDdayColor(getDday(nextEvent.date))}`}>
              {formatDday(getDday(nextEvent.date))}
            </span>
          </div>
        </Card>
      )}

      {/* 필터 바 */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-1 bg-dark-card border border-dark-border rounded-xl p-1 w-fit">
          {COUNTRY_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setCountryFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                countryFilter === tab.key
                  ? "bg-dark-elevated text-dark-text-primary"
                  : "text-dark-text-secondary hover:text-dark-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-dark-card border border-dark-border rounded-xl p-1 w-fit">
          {TIME_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setTimeFilter(tab.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                timeFilter === tab.key
                  ? "bg-dark-elevated text-dark-text-primary"
                  : "text-dark-text-secondary hover:text-dark-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 결과 카운트 */}
      <p className="text-xs text-dark-text-muted">{filtered.length}개 이벤트</p>

      {/* 이벤트 타임라인 */}
      <div className="space-y-2">
        {filtered.map((event, i) => {
          const dday = getDday(event.date);
          const isPast = dday < 0;

          return (
            <Card key={`${event.date}-${event.name}-${i}`} className={`border border-dark-border p-4 ${isPast ? "opacity-60" : ""}`}>
              <div className="flex items-start gap-3">
                {/* 날짜 + D-day */}
                <div className="flex-shrink-0 w-16 text-center">
                  <p className="text-xs font-semibold text-dark-text-secondary">{formatDate(event.date)}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${getDdayColor(dday)}`}>
                    {formatDday(dday)}
                  </span>
                </div>

                {/* 내용 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-lg leading-none">{event.icon}</span>
                    <p className="text-sm font-semibold text-dark-text-primary">{event.name}</p>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        event.importance === "high"
                          ? "bg-toss-red/20 text-toss-red"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {event.importance === "high" ? "중요" : "보통"}
                    </span>
                    {event.time && (
                      <span className="text-[10px] text-dark-text-muted">
                        {event.country === "US" ? "ET" : "KST"} {event.time}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-dark-text-secondary mt-1">{event.description}</p>

                  {/* 이전/예상 수치 */}
                  {(event.previous || event.forecast) && (
                    <div className="flex gap-4 mt-2">
                      {event.previous && (
                        <div>
                          <span className="text-[10px] text-dark-text-muted">이전</span>
                          <span className="text-xs font-semibold text-dark-text-primary ml-1">{event.previous}</span>
                        </div>
                      )}
                      {event.forecast && (
                        <div>
                          <span className="text-[10px] text-dark-text-muted">예상</span>
                          <span className="text-xs font-semibold text-toss-blue ml-1">{event.forecast}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <p className="text-sm text-dark-text-muted text-center py-8">해당 기간에 이벤트가 없습니다</p>
        )}
      </div>
    </div>
  );
}
