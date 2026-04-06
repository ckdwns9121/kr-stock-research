import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getChangeColor, getChangeBgColor } from "@/lib/utils";
import type { GlobalMarketData } from "@/types/global-market";

interface Props {
  data: GlobalMarketData | null;
}

export function GlobalMarketSection({ data }: Props) {
  if (!data) {
    return (
      <section>
        <h2 className="text-base font-semibold text-dark-text-primary mb-3">🌐 미국 시장</h2>
        <Card>
          <p className="text-sm text-dark-text-muted text-center py-6">
            글로벌 시황 데이터를 불러올 수 없습니다
          </p>
        </Card>
      </section>
    );
  }

  const sortedSectors = [...data.sectors].sort((a, b) => b.changePercent - a.changePercent);
  const strongSectors = sortedSectors.slice(0, 3);
  const weakSectors = sortedSectors.slice(-3).reverse();

  const cachedMinutesAgo = Math.floor((Date.now() - data.cachedAt) / 60000);
  const cacheLabel = cachedMinutesAgo <= 1 ? "방금 전" : `${cachedMinutesAgo}분 전`;

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-dark-text-primary">🌐 미국 시장</h2>
          <p className="text-xs text-dark-text-muted mt-0.5">캐시 기준 {cacheLabel} · 30분 주기 갱신</p>
        </div>
      </div>

      {/* 주요 지수 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">주요 지수</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {data.indices.length === 0 ? (
            <p className="text-sm text-dark-text-muted text-center py-3 sm:col-span-3">
              지수 데이터를 불러오지 못했습니다
            </p>
          ) : (
            data.indices.map((idx) => {
              const changeColor = getChangeColor(idx.change);
              const sign = idx.change >= 0 ? "+" : "";
              return (
                <Card key={idx.symbol} className="bg-dark-elevated">
                  <p className="text-xs font-medium text-dark-text-secondary mb-1">{idx.name}</p>
                  <p className="text-2xl font-bold text-dark-text-primary">
                    {idx.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                  </p>
                  <p className={`text-sm font-semibold mt-1 ${changeColor}`}>
                    {sign}{idx.change.toFixed(2)} ({sign}{idx.changePercent.toFixed(2)}%)
                  </p>
                </Card>
              );
            })
          )}
        </div>
      </Card>

      {/* 매크로 지표 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">매크로 지표</CardTitle>
        </CardHeader>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MacroItem label="VIX (공포지수)" value={data.macro.vix} decimals={2} />
          <MacroItem label="미국 10년 금리" value={data.macro.tenYearYield} decimals={2} suffix="%" />
          <MacroItem label="달러 인덱스 (DXY)" value={data.macro.dxy} decimals={2} />
        </div>
      </Card>

      {/* AI 분석 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">AI 시장 분석</CardTitle>
        </CardHeader>
        {data.aiAnalysis ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <RiskBadge sentiment={data.aiAnalysis.riskSentiment} />
              <p className="text-sm text-dark-text-secondary leading-relaxed">
                {data.aiAnalysis.marketSummary}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectorReasonList
                title="🔺 강세 섹터"
                items={data.aiAnalysis.strongSectors}
                positive
              />
              <SectorReasonList
                title="🔻 약세 섹터"
                items={data.aiAnalysis.weakSectors}
                positive={false}
              />
            </div>
          </div>
        ) : (
          <p className="text-sm text-dark-text-muted py-2">
            AI 분석을 사용할 수 없습니다 (OPENAI_API_KEY 미설정)
          </p>
        )}
      </Card>

      {/* 섹터 등락 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SectorList title="🔺 강세 섹터 ETF" sectors={strongSectors} />
        <SectorList title="🔻 약세 섹터 ETF" sectors={weakSectors} />
      </div>
    </section>
  );
}

function MacroItem({
  label,
  value,
  decimals,
  suffix = "",
}: {
  label: string;
  value: number;
  decimals: number;
  suffix?: string;
}) {
  const displayValue = value === 0 ? "-" : `${value.toFixed(decimals)}${suffix}`;
  return (
    <Card className="bg-dark-elevated">
      <p className="text-xs font-medium text-dark-text-secondary mb-1">{label}</p>
      <p className="text-xl font-bold text-dark-text-primary">{displayValue}</p>
    </Card>
  );
}

function RiskBadge({ sentiment }: { sentiment: "risk-on" | "risk-off" | "neutral" }) {
  const config = {
    "risk-on": { label: "Risk-on", variant: "positive" as const },
    "risk-off": { label: "Risk-off", variant: "negative" as const },
    neutral: { label: "중립", variant: "default" as const },
  };
  const { label, variant } = config[sentiment];
  return <Badge variant={variant}>{label}</Badge>;
}

function SectorReasonList({
  title,
  items,
  positive,
}: {
  title: string;
  items: { name: string; reason: string }[];
  positive: boolean;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-dark-text-primary mb-2">{title}</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.name} className="bg-dark-elevated rounded-lg p-3">
            <p className={`text-sm font-semibold mb-0.5 ${positive ? "text-toss-red" : "text-toss-blue"}`}>
              {item.name}
            </p>
            <p className="text-xs text-dark-text-secondary leading-relaxed">{item.reason}</p>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-xs text-dark-text-muted">데이터 없음</p>
        )}
      </div>
    </div>
  );
}

function SectorList({
  title,
  sectors,
}: {
  title: string;
  sectors: { symbol: string; name: string; changePercent: number }[];
}) {
  return (
    <Card>
      <h3 className="text-sm font-semibold text-dark-text-primary mb-3">{title}</h3>
      <div className="space-y-2">
        {sectors.map((sector, i) => {
          const bgColor = getChangeBgColor(sector.changePercent);
          const sign = sector.changePercent >= 0 ? "+" : "";
          return (
            <div
              key={sector.symbol}
              className="flex items-center justify-between py-1.5"
            >
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-bold text-dark-text-muted w-4 text-right">{i + 1}</span>
                <div>
                  <p className="text-sm font-medium text-dark-text-primary">{sector.name}</p>
                  <p className="text-xs text-dark-text-muted">{sector.symbol}</p>
                </div>
              </div>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${bgColor}`}>
                {sign}{sector.changePercent.toFixed(2)}%
              </span>
            </div>
          );
        })}
        {sectors.length === 0 && (
          <p className="text-sm text-dark-text-muted text-center py-2">데이터 없음</p>
        )}
      </div>
    </Card>
  );
}
