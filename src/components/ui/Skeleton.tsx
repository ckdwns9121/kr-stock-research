interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-dark-elevated rounded-xl ${className}`}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-dark-card rounded-2xl shadow-card p-5">
      <Skeleton className="h-5 w-32 mb-4" />
      <Skeleton className="h-8 w-48 mb-2" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="bg-dark-card rounded-2xl shadow-card p-5">
      <Skeleton className="h-5 w-24 mb-4" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function NewsListSkeleton() {
  return (
    <div className="bg-dark-card rounded-2xl shadow-card p-5 space-y-4">
      <Skeleton className="h-5 w-24 mb-2" />
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-3 w-32" />
        </div>
      ))}
    </div>
  );
}
