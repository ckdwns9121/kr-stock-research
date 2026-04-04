import type { MarketIndex } from "@/types/market";
import { MarketIndexCard } from "./MarketIndexCard";
import { CardSkeleton } from "@/components/ui/Skeleton";

async function fetchMarketOverview(): Promise<MarketIndex[]> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/stock/overview`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data?.indices ?? [];
  } catch {
    return [];
  }
}

export async function MarketOverview() {
  const indices = await fetchMarketOverview();

  if (indices.length === 0) {
    return (
      <div className="flex gap-4">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {indices.map((index) => (
        <MarketIndexCard key={index.name} index={index} />
      ))}
    </div>
  );
}
