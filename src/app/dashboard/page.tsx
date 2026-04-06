import type { Metadata } from "next";
import Link from "next/link";
import { fetchMacroDashboardData } from "@/lib/dashboard/macro";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { formatDate, formatPrice, formatPercent } from "@/lib/format";
import { getChangeColor } from "@/lib/utils";
import type { DataMeta, MacroMetric, SectorPerformance } from "@/types/dashboard";
import type { MarketIndex } from "@/types/market";
import { GlobalMarketSection } from "@/components/dashboard/GlobalMarketSection";
import type { GlobalMarketData } from "@/types/global-market";
import { StockRankingTable } from "@/components/dashboard/StockRankingTable";
import { MarketTickerBar } from "@/components/dashboard/MarketTickerBar";
import type { TickerItem } from "@/components/dashboard/MarketTickerBar";

export const metadata: Metadata = {
  title: "매크로 시황 대시보드 - 주식리서치",
  description: "리스크 온/오프, 강약 섹터, 주요 지수·거시지표·뉴스를 한 화면에서 확인하세요.",
};

export const revalidate = 60;

async function fetchGlobalMarketData(baseUrl: string): Promise<GlobalMarketData | null> {
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/global`, {
      next: { revalidate: 1800 },
    });
    if (!res.ok) return null;
    return (await res.json()) as GlobalMarketData;
  } catch {
    return null;
  }
}

export default async function DashboardPage() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
  const [dashboard, globalMarket] = await Promise.all([
    fetchMacroDashboardData(),
    fetchGlobalMarketData(baseUrl),
  ]);

  const tickerItems: TickerItem[] = [
    ...dashboard.indices.items.map((idx) => ({
      name: idx.name,
      value: idx.value,
      changePercent: idx.changePercent,
    })),
    ...(globalMarket?.indices ?? []).map((idx) => ({
      name: idx.name,
      value: idx.price,
      changePercent: idx.changePercent,
    })),
    ...dashboard.macro.items.map((m) => ({
      name: m.name,
      value: m.value,
      changePercent: m.changePercent,
    })),
  ];

  return (
    <div className="space-y-6">
      <MarketTickerBar items={tickerItems} />
      <section className="pt-4">
        <h1 className="text-2xl font-bold text-dark-text-primary">글로벌 매크로 대시보드</h1>
        <p className="text-sm text-dark-text-secondary mt-1">
          30초 안에 오늘의 시장 체온(Risk-on / Risk-off)과 강약 섹터를 파악하세요
        </p>
      </section>

      <GlobalMarketSection data={globalMarket} />

      {/* 오늘의 해석 */}
      <section>
        <Card className="border border-dark-border">
          <CardHeader className="flex items-start justify-between">
            <div>
              <CardTitle className="text-base">오늘의 해석</CardTitle>
              <p className="text-sm text-dark-text-secondary mt-1">{dashboard.summary.headline}</p>
              {dashboard.summary.aiComment && (
                <p className="text-sm text-dark-text-primary mt-2 leading-relaxed">{dashboard.summary.aiComment}</p>
              )}
            </div>
            <StatusBadge meta={dashboard.summaryMeta} />
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card className="bg-dark-elevated p-4">
              <p className="text-xs text-dark-text-secondary mb-1">시장 체온</p>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold ${getRegimeColor(dashboard.summary.regime)}`}>
                  {dashboard.summary.regime}
                </span>
                <Badge variant={dashboard.summary.regime === "Risk-on" ? "positive" : dashboard.summary.regime === "Risk-off" ? "negative" : "default"}>
                  {dashboard.summary.regime === "Risk-on" ? "공격 우위" : dashboard.summary.regime === "Risk-off" ? "방어 우위" : "혼조"}
                </Badge>
              </div>
            </Card>
            <Card className="bg-dark-elevated p-4">
              <p className="text-xs text-dark-text-secondary mb-1">강한 섹터</p>
              <p className="text-lg font-bold text-dark-text-primary">
                {dashboard.summary.strongSector ? `${dashboard.summary.strongSector.emoji} ${dashboard.summary.strongSector.name}` : "-"}
              </p>
            </Card>
            <Card className="bg-dark-elevated p-4">
              <p className="text-xs text-dark-text-secondary mb-1">약한 섹터</p>
              <p className="text-lg font-bold text-dark-text-primary">
                {dashboard.summary.weakSector ? `${dashboard.summary.weakSector.emoji} ${dashboard.summary.weakSector.name}` : "-"}
              </p>
            </Card>
          </div>
        </Card>
      </section>

      {/* 해석 근거 */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-dark-text-primary">해석 근거</h2>
          <p className="text-xs text-dark-text-muted">섹터 점수 = 평균등락률 × 0.7 + 상승종목비율 × 0.3</p>
        </div>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">주요 지수</CardTitle>
            <StatusBadge meta={dashboard.indices.meta} />
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dashboard.indices.items.map((idx) => (
              <IndexCard key={idx.name} index={idx} />
            ))}
            {dashboard.indices.items.length === 0 && <EmptyInCard text="지수 데이터를 불러오지 못했습니다" />}
          </div>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">거시 지표</CardTitle>
            <StatusBadge meta={dashboard.macro.meta} />
          </CardHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dashboard.macro.items.map((metric) => (
              <MacroCard key={metric.key} metric={metric} />
            ))}
            {dashboard.macro.items.length === 0 && <EmptyInCard text="거시 지표를 불러오지 못했습니다" />}
          </div>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle className="text-base">섹터 강약</CardTitle>
            <StatusBadge meta={dashboard.sectors.meta} />
          </CardHeader>
          <div className="space-y-2.5">
            {dashboard.sectors.items.map((sector, i) => (
              <SectorRow key={sector.id} sector={sector} rank={i + 1} />
            ))}
            {dashboard.sectors.items.length === 0 && <EmptyInCard text="섹터 데이터를 불러오지 못했습니다" />}
          </div>
        </Card>
      </section>

      {/* 종목 랭킹 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-dark-text-primary">종목 랭킹</h2>
          <StatusBadge meta={dashboard.leaders.meta} />
        </div>
        <StockRankingTable gainers={dashboard.leaders.gainers} losers={dashboard.leaders.losers} />
      </section>

      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-dark-text-primary">시장 뉴스</h2>
          <div className="flex items-center gap-3">
            <StatusBadge meta={dashboard.news.meta} />
            <Link href="/news" className="text-sm text-toss-blue hover:text-toss-blue-dark transition-colors">
            전체 보기 →
            </Link>
          </div>
        </div>
        <Card>
          {dashboard.news.items.map((item, i) => (
            <a
              key={i}
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block py-2.5 px-1 -mx-1 rounded-lg hover:bg-dark-elevated transition-colors"
            >
              <p className="text-sm font-medium text-dark-text-primary line-clamp-1">
                {item.title}
              </p>
              {item.source && (
                <p className="text-xs text-dark-text-muted mt-0.5">{item.source}</p>
              )}
            </a>
          ))}
          {dashboard.news.items.length === 0 && (
            <p className="text-sm text-dark-text-muted text-center py-4">
              뉴스를 불러올 수 없습니다
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}

function getRegimeColor(regime: "Risk-on" | "Risk-off" | "중립") {
  if (regime === "Risk-on") return "text-toss-red";
  if (regime === "Risk-off") return "text-toss-blue";
  return "text-dark-text-secondary";
}

function StatusBadge({ meta }: { meta: DataMeta }) {
  const label = meta.status === "fresh" ? "정상" : meta.status === "stale" ? "부분갱신" : "미수신";
  const variant = meta.status === "fresh" ? "default" : "stale";
  return (
    <div className="text-right">
      <div className="flex justify-end">
        <Badge variant={variant}>{label}</Badge>
      </div>
      <p className="text-[11px] text-dark-text-muted mt-1">
        {meta.source} · {meta.ttlLabel}
        {meta.lastUpdated ? ` · ${formatDate(meta.lastUpdated)}` : ""}
      </p>
    </div>
  );
}

function IndexCard({ index }: { index: MarketIndex }) {
  const changeColor = getChangeColor(index.change);
  const sign = index.change > 0 ? "+" : "";

  return (
    <Card className="bg-dark-elevated">
      <p className="text-xs font-medium text-dark-text-secondary mb-1">{index.name}</p>
      <p className="text-2xl font-bold text-dark-text-primary">
        {index.value.toLocaleString("ko-KR", { minimumFractionDigits: 2 })}
      </p>
      <p className={`text-sm font-semibold mt-1 ${changeColor}`}>
        {sign}{index.change.toFixed(2)} ({formatPercent(index.changePercent)})
      </p>
    </Card>
  );
}

function MacroCard({ metric }: { metric: MacroMetric }) {
  const changeColor = getChangeColor(metric.changePercent);
  const sign = metric.changePercent > 0 ? "+" : "";

  return (
    <Card className="bg-dark-elevated">
      <p className="text-xs font-medium text-dark-text-secondary mb-1">{metric.name}</p>
      <p className="text-lg font-bold text-dark-text-primary">
        {metric.value.toLocaleString("ko-KR", { minimumFractionDigits: 2 })}{metric.unit}
      </p>
      <p className={`text-xs font-medium mt-1 ${changeColor}`}>
        {sign}{metric.change.toFixed(2)} ({formatPercent(metric.changePercent)})
      </p>
    </Card>
  );
}

function SectorRow({ sector, rank }: { sector: SectorPerformance; rank: number }) {
  const scoreColor = getChangeColor(sector.avgChangePercent);
  return (
    <Link
      href={`/sectors/${sector.id}`}
      className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-dark-elevated transition-colors"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-xs font-bold text-dark-text-muted w-5 text-right">{rank}</span>
        <p className="text-sm font-semibold text-dark-text-primary truncate">
          {sector.emoji} {sector.name}
        </p>
      </div>
      <div className="text-right">
        <p className={`text-sm font-semibold ${scoreColor}`}>점수 {sector.score.toFixed(2)}</p>
        <p className="text-xs text-dark-text-muted">
          평균 {formatPercent(sector.avgChangePercent)} · 상승비율 {(sector.advancerRatio * 100).toFixed(0)}%
        </p>
      </div>
    </Link>
  );
}

function EmptyInCard({ text }: { text: string }) {
  return <p className="text-sm text-dark-text-muted text-center py-3 sm:col-span-3">{text}</p>;
}

