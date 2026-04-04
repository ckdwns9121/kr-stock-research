import { CardSkeleton, ChartSkeleton, NewsListSkeleton } from "@/components/ui/Skeleton";
import { Skeleton } from "@/components/ui/Skeleton";

export default function StockLoading() {
  return (
    <div className="space-y-6">
      {/* Company Header skeleton */}
      <div className="py-4">
        <Skeleton className="h-4 w-16 mb-1" />
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-6 w-40" />
      </div>

      {/* Chart + Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2">
          <ChartSkeleton />
        </div>
        <CardSkeleton />
      </div>

      {/* Financials */}
      <CardSkeleton />

      {/* News */}
      <NewsListSkeleton />
    </div>
  );
}
