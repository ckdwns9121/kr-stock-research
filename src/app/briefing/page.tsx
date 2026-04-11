import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 일일 브리핑 - 주식리서치",
  description: "AI가 분석한 오늘의 한국 주식시장 브리핑",
};

interface BriefingData {
  headline: string;
  marketOverview: string;
  keyEvents: string[];
  sectorsToWatch: string[];
  riskFactors: string[];
  actionItems: string[];
}

async function fetchBriefing(): Promise<BriefingData | null> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/briefing`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

function todayKST(): string {
  return new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "Asia/Seoul",
  });
}

function Section({
  emoji,
  title,
  children,
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-dark-card rounded-2xl p-5">
      <h2 className="text-base font-semibold text-dark-text-primary mb-3 flex items-center gap-2">
        <span>{emoji}</span>
        <span>{title}</span>
      </h2>
      {children}
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-dark-text-secondary">
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-dark-text-muted flex-shrink-0" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-3 text-sm text-dark-text-secondary">
          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-dark-elevated text-dark-text-muted text-xs flex items-center justify-center font-medium">
            {i + 1}
          </span>
          <span className="pt-0.5">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function CheckList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm text-dark-text-secondary">
          <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded border border-dark-border flex items-center justify-center">
            <svg
              className="w-2.5 h-2.5 text-dark-text-muted"
              fill="none"
              viewBox="0 0 10 10"
            >
              <path
                d="M1.5 5l2.5 2.5 4.5-4.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

export default async function BriefingPage() {
  const briefing = await fetchBriefing();
  const today = todayKST();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-dark-card rounded-2xl p-5">
        <p className="text-xs text-dark-text-muted mb-1">{today}</p>
        <h1 className="text-xl font-bold text-dark-text-primary">AI 일일 브리핑</h1>
        <p className="text-sm text-dark-text-muted mt-1">
          AI가 시장 데이터와 뉴스를 분석한 오늘의 투자 브리핑입니다.
        </p>
      </div>

      {briefing === null ? (
        <div className="bg-dark-card rounded-2xl p-8 text-center">
          <p className="text-dark-text-muted text-sm">
            브리핑 데이터를 불러올 수 없습니다.
            <br />
            <span className="text-xs mt-1 block">
              OPENAI_API_KEY가 설정되지 않았거나 일시적인 오류입니다.
            </span>
          </p>
        </div>
      ) : (
        <>
          {/* Headline */}
          <Section emoji="🎯" title="핵심 헤드라인">
            <p className="text-lg font-semibold text-dark-text-primary leading-snug">
              {briefing.headline}
            </p>
          </Section>

          {/* Market Overview */}
          <Section emoji="📊" title="시장 개요">
            <p className="text-sm text-dark-text-secondary leading-relaxed">
              {briefing.marketOverview}
            </p>
          </Section>

          {/* Key Events */}
          <Section emoji="📅" title="주목할 이벤트">
            <NumberedList items={briefing.keyEvents} />
          </Section>

          {/* Sectors to Watch */}
          <Section emoji="🔍" title="주목 섹터">
            <BulletList items={briefing.sectorsToWatch} />
          </Section>

          {/* Risk Factors */}
          <Section emoji="⚠️" title="리스크 요인">
            <BulletList items={briefing.riskFactors} />
          </Section>

          {/* Action Items */}
          <Section emoji="✅" title="오늘의 체크리스트">
            <CheckList items={briefing.actionItems} />
          </Section>

          <p className="text-xs text-dark-text-muted text-center pb-4">
            본 브리핑은 AI가 생성한 참고 자료이며, 투자 권유가 아닙니다.
          </p>
        </>
      )}
    </div>
  );
}
