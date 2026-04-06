"use client";

import { useState, useCallback } from "react";
import { useRefreshInterval } from "@/hooks/useRefreshInterval";
import { NewsItem } from "./NewsItem";
import { NewsListSkeleton } from "@/components/ui/Skeleton";
import type { NewsItem as NewsItemType } from "@/types/news";

interface NewsFeedProps {
  initialItems?: NewsItemType[];
}

export function NewsFeed({ initialItems = [] }: NewsFeedProps) {
  const [items, setItems] = useState<NewsItemType[]>(initialItems);
  const [isLoading, setIsLoading] = useState(initialItems.length === 0);

  const fetchNews = useCallback(async () => {
    try {
      const res = await fetch("/api/news");
      if (!res.ok) return;
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      // keep stale data on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount if no initial items
  useState(() => {
    if (initialItems.length === 0) {
      fetchNews();
    }
  });

  useRefreshInterval(fetchNews, 60_000);

  if (isLoading) {
    return <NewsListSkeleton />;
  }

  if (items.length === 0) {
    return (
      <div className="bg-dark-card rounded-2xl shadow-card p-5">
        <p className="text-sm text-dark-text-secondary text-center py-8">
          뉴스를 불러올 수 없습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-dark-card rounded-2xl shadow-card p-5">
      <h2 className="text-base font-semibold text-dark-text-primary mb-1">
        시장 뉴스
      </h2>
      <div>
        {items.map((item, idx) => (
          <NewsItem key={`${item.url}-${idx}`} item={item} />
        ))}
      </div>
    </div>
  );
}
