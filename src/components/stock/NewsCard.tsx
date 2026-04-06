import type { NewsItem } from "@/types/news";
import { formatDate } from "@/lib/format";

interface NewsCardProps {
  item: NewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  return (
    <div className="group py-3 px-2 -mx-2 rounded-xl hover:bg-dark-elevated transition-colors">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <p className="text-sm font-medium text-dark-text-primary group-hover:text-toss-blue transition-colors leading-snug line-clamp-2">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-xs text-dark-text-muted font-medium">
            {item.source}
          </span>
          <span className="text-xs text-dark-text-muted">·</span>
          <span className="text-xs text-dark-text-muted">
            {formatDate(item.date)}
          </span>
        </div>
      </a>
    </div>
  );
}
