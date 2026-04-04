import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getSectorById } from "@/lib/sectors";
import { fetchStockSummary, fetchNaverMetrics } from "@/lib/api/naver";
import { fetchNaverSectorDetail } from "@/lib/api/naver-sectors";
import { Card } from "@/components/ui/Card";
import { formatPercent, formatPrice, formatRatio } from "@/lib/format";
import { getChangeColor } from "@/lib/utils";

interface SectorDetailPageProps {
  params: {
    sectorId: string;
  };
}

export async function generateMetadata({
  params,
}: SectorDetailPageProps): Promise<Metadata> {
  if (params.sectorId.startsWith("naver-")) {
    return {
      title: "업종 상세 - 주식리서치",
    };
  }

  const sector = getSectorById(params.sectorId);
  if (!sector) {
    return {
      title: "섹터 상세 - 주식리서치",
    };
  }

  return {
    title: `${sector.name} 섹터 상세 - 주식리서치`,
    description: `${sector.name} 섹터 주요 종목 현황과 밸류에이션 지표를 확인하세요.`,
  };
}

export const revalidate = 300;

export default async function SectorDetailPage({ params }: SectorDetailPageProps) {
  if (params.sectorId.startsWith("naver-")) {
    const naverNo = params.sectorId.replace("naver-", "");
    if (!/^\d+$/.test(naverNo)) notFound();
    const detail = await fetchNaverSectorDetail(naverNo);

    return (
      <div className="space-y-6">
        <section className="pt-4">
          <Link
            href="/sectors"
            className="inline-flex items-center text-sm text-toss-gray-500 hover:text-toss-gray-900 transition-colors"
          >
            ← 섹터 목록으로
          </Link>
          <h1 className="text-2xl font-bold text-toss-gray-900 mt-2">
            📊 {detail.sectorName}
          </h1>
          <p className="text-sm text-toss-gray-500 mt-1">
            업종 구성 종목 {detail.stocks.length}개
          </p>
        </section>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-toss-gray-100">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-toss-gray-500">종목</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-toss-gray-500">현재가</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-toss-gray-500">등락률</th>
                </tr>
              </thead>
              <tbody>
                {detail.stocks.map((stock) => {
                  const changeColor =
                    typeof stock.changePercent === "number" ? getChangeColor(stock.changePercent) : "";
                  return (
                    <tr
                      key={stock.ticker}
                      className="border-b border-toss-gray-50 last:border-0 hover:bg-toss-gray-50 transition-colors"
                    >
                      <td className="py-3 px-2">
                        <Link href={`/stock/${stock.ticker}`} className="hover:text-toss-blue transition-colors">
                          <p className="font-semibold text-toss-gray-900">{stock.name}</p>
                          <p className="text-xs text-toss-gray-400">{stock.ticker}</p>
                        </Link>
                      </td>
                      <td className="text-right py-3 px-2 font-medium text-toss-gray-900">
                        {typeof stock.price === "number" ? `${formatPrice(stock.price)}원` : "-"}
                      </td>
                      <td className={`text-right py-3 px-2 font-medium ${changeColor}`}>
                        {typeof stock.changePercent === "number"
                          ? formatPercent(stock.changePercent)
                          : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  const sector = getSectorById(params.sectorId);
  if (!sector) notFound();

  const [priceResults, metricsResults] = await Promise.all([
    Promise.allSettled(sector.stocks.map((stock) => fetchStockSummary(stock.ticker))),
    Promise.allSettled(sector.stocks.map((stock) => fetchNaverMetrics(stock.ticker))),
  ]);

  const rows = sector.stocks.map((stock, i) => {
    const price = priceResults[i].status === "fulfilled" ? priceResults[i].value : null;
    const metrics = metricsResults[i].status === "fulfilled" ? metricsResults[i].value : {};
    return { stock, price, metrics };
  });

  return (
    <div className="space-y-6">
      <section className="pt-4">
        <Link
          href="/sectors"
          className="inline-flex items-center text-sm text-toss-gray-500 hover:text-toss-gray-900 transition-colors"
        >
          ← 섹터 목록으로
        </Link>
        <h1 className="text-2xl font-bold text-toss-gray-900 mt-2">
          {sector.emoji} {sector.name} 섹터 상세
        </h1>
        <p className="text-sm text-toss-gray-500 mt-1">
          주요 종목 {sector.stocks.length}개를 한눈에 확인하세요
        </p>
      </section>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-toss-gray-100">
                <th className="text-left py-3 px-2 text-xs font-semibold text-toss-gray-500">종목</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-toss-gray-500">현재가</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-toss-gray-500">등락률</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-toss-gray-500">PER</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-toss-gray-500">PBR</th>
                <th className="text-right py-3 px-2 text-xs font-semibold text-toss-gray-500">ROE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ stock, price, metrics }) => {
                const changeColor = price ? getChangeColor(price.changePercent) : "";
                return (
                  <tr
                    key={stock.ticker}
                    className="border-b border-toss-gray-50 last:border-0 hover:bg-toss-gray-50 transition-colors"
                  >
                    <td className="py-3 px-2">
                      <Link href={`/stock/${stock.ticker}`} className="hover:text-toss-blue transition-colors">
                        <p className="font-semibold text-toss-gray-900">{stock.name}</p>
                        <p className="text-xs text-toss-gray-400">
                          {stock.ticker} · {stock.description}
                        </p>
                      </Link>
                    </td>
                    <td className="text-right py-3 px-2 font-medium text-toss-gray-900">
                      {price ? `${formatPrice(price.currentPrice)}원` : "-"}
                    </td>
                    <td className={`text-right py-3 px-2 font-medium ${changeColor}`}>
                      {price ? formatPercent(price.changePercent) : "-"}
                    </td>
                    <td className="text-right py-3 px-2 text-toss-gray-700">
                      {metrics?.per ? `${formatRatio(metrics.per)}배` : "-"}
                    </td>
                    <td className="text-right py-3 px-2 text-toss-gray-700">
                      {metrics?.pbr ? `${formatRatio(metrics.pbr)}배` : "-"}
                    </td>
                    <td className="text-right py-3 px-2 text-toss-gray-700">
                      {metrics?.roe ? `${formatRatio(metrics.roe)}%` : "-"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
