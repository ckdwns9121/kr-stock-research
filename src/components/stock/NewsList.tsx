import type { NewsItem } from "@/types/news";
import { timeAgo } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { NewsCard } from "@/components/stock/NewsCard";

interface NewsListProps {
  news: NewsItem[];
  title?: string;
  stale?: boolean;
  cachedAt?: number;
}

export function NewsList({
  news,
  title = "관련 뉴스",
  stale,
  cachedAt,
}: NewsListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {stale && cachedAt && (
            <Badge variant="stale">{timeAgo(cachedAt)} 데이터</Badge>
          )}
        </div>
      </CardHeader>

      {news.length === 0 ? (
        <p className="text-sm text-toss-gray-400 py-4 text-center">
          뉴스가 없습니다
        </p>
      ) : (
        <div className="divide-y divide-toss-gray-50">
          {news.map((item, i) => (
            <NewsCard key={i} item={item} />
          ))}
        </div>
      )}
    </Card>
  );
}
