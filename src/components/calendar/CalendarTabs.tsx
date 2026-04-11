"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";

interface EconomicEvent {
  name: string;
  country: "KR" | "US";
  frequency: string;
  importance: "high" | "medium";
  description: string;
  icon: string;
}

type TabKey = "all" | "US" | "KR";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "US", label: "🇺🇸 미국" },
  { key: "KR", label: "🇰🇷 한국" },
];

interface CalendarTabsProps {
  events: EconomicEvent[];
}

export function CalendarTabs({ events }: CalendarTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("all");

  const filtered = activeTab === "all" ? events : events.filter((e) => e.country === activeTab);

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-1 bg-dark-card border border-dark-border rounded-xl p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-dark-elevated text-dark-text-primary"
                : "text-dark-text-secondary hover:text-dark-text-primary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Event cards */}
      <div className="space-y-3">
        {filtered.map((event, i) => (
          <Card key={i} className="border border-dark-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <span className="text-2xl leading-none mt-0.5">{event.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-dark-text-primary">{event.name}</p>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        event.importance === "high"
                          ? "bg-toss-red/20 text-toss-red"
                          : "bg-yellow-500/20 text-yellow-400"
                      }`}
                    >
                      {event.importance === "high" ? "중요" : "보통"}
                    </span>
                  </div>
                  <p className="text-xs text-dark-text-muted mt-0.5">{event.frequency}</p>
                  <p className="text-xs text-dark-text-secondary mt-1.5 leading-relaxed">
                    {event.description}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
