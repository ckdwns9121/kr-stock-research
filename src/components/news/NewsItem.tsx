import type { NewsItem as NewsItemType } from "@/types/news";
import { formatDate } from "@/lib/format";

interface NewsItemProps {
  item: NewsItemType;
}

export function NewsItem({ item }: NewsItemProps) {
  return (
    <div className="py-3 border-b border-dark-border last:border-0">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        <p className="text-sm font-medium text-dark-text-primary group-hover:text-toss-blue transition-colors leading-snug mb-1">
          {item.title}
        </p>
        <div className="flex items-center gap-2 text-xs text-dark-text-secondary">
          <span>{item.source}</span>
          <span>·</span>
          <span>{formatDate(item.date)}</span>
        </div>
      </a>
    </div>
  );
}
