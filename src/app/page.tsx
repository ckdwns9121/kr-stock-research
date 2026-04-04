import { Suspense } from "react";
import { SearchBar } from "@/components/search/SearchBar";
import { MarketOverview } from "@/components/market/MarketOverview";
import { NewsItem } from "@/components/news/NewsItem";
import { CardSkeleton } from "@/components/ui/Skeleton";
import type { NewsItem as NewsItemType } from "@/types/news";

async function fetchRecentNews(): Promise<NewsItemType[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/news`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return (json.data ?? []).slice(0, 5);
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const recentNews = await fetchRecentNews();

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <section className="text-center pt-8 pb-4">
        <h1 className="text-3xl font-bold text-toss-gray-900 mb-2">
          국내 주식 리서치
        </h1>
        <p className="text-base text-toss-gray-500 mb-8">
          뉴스, 시황, 기업분석을 한 곳에서 확인하세요
        </p>
        <div className="max-w-xl mx-auto">
          <SearchBar placeholder="종목명 또는 티커 검색 (예: 삼성전자, 005930)" />
        </div>
      </section>

      {/* Market overview */}
      <section>
        <h2 className="text-base font-semibold text-toss-gray-900 mb-3">
          시장 현황
        </h2>
        <Suspense
          fallback={
            <div className="flex gap-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          }
        >
          <MarketOverview />
        </Suspense>
      </section>

      {/* Recent news */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-toss-gray-900">
            최신 뉴스
          </h2>
          <a
            href="/news"
            className="text-sm text-toss-blue hover:text-toss-blue-dark transition-colors"
          >
            전체 보기 →
          </a>
        </div>
        {recentNews.length > 0 ? (
          <div className="bg-white rounded-2xl shadow-card p-5">
            {recentNews.map((item, idx) => (
              <NewsItem key={`${item.url}-${idx}`} item={item} />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card p-5">
            <p className="text-sm text-toss-gray-500 text-center py-4">
              뉴스를 불러올 수 없습니다.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
