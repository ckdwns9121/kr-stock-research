import { Suspense } from "react";
import type { Metadata } from "next";
import { MarketSummary } from "@/components/news/MarketSummary";
import { NewsFeed } from "@/components/news/NewsFeed";
import { CardSkeleton, NewsListSkeleton } from "@/components/ui/Skeleton";
import type { NewsItem } from "@/types/news";

export const metadata: Metadata = {
  title: "뉴스 - 주식리서치",
  description: "국내 주식 시장 최신 뉴스를 확인하세요.",
};

async function fetchInitialNews(): Promise<NewsItem[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/news`, {
      next: { revalidate: 120 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export default async function NewsPage() {
  const initialNews = await fetchInitialNews();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-dark-text-primary mb-1">뉴스</h1>
        <p className="text-sm text-dark-text-secondary">
          국내 주식 시장 최신 뉴스
        </p>
      </div>

      <Suspense
        fallback={
          <div>
            <div className="text-sm font-medium text-dark-text-secondary mb-3">
              시장 현황
            </div>
            <div className="flex gap-4">
              <CardSkeleton />
              <CardSkeleton />
            </div>
          </div>
        }
      >
        <MarketSummary />
      </Suspense>

      <NewsFeed initialItems={initialNews} />
    </div>
  );
}
