import type { NewsItem } from "@/types/news";
import { formatDate } from "@/lib/format";

interface NewsCardProps {
  item: NewsItem;
}

export function NewsCard({ item }: NewsCardProps) {
  return (
    <div className="group py-3 px-2 -mx-2 rounded-xl hover:bg-toss-gray-50 transition-colors">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
      >
        <p className="text-sm font-medium text-toss-gray-900 group-hover:text-toss-blue transition-colors leading-snug line-clamp-2">
          {item.title}
        </p>
        <div className="flex items-center gap-1.5 mt-1.5">
          <span className="text-xs text-toss-gray-400 font-medium">
            {item.source}
          </span>
          <span className="text-xs text-toss-gray-300">·</span>
          <span className="text-xs text-toss-gray-400">
            {formatDate(item.date)}
          </span>
        </div>
      </a>
    </div>
  );
}
