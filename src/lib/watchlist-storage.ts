export interface WatchlistItem {
  ticker: string;
  name: string;
  sector: string;
  addedAt: string;
  memo?: string;
}

const STORAGE_KEY = "kr-stock-watchlist";

export function getWatchlist(): WatchlistItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WatchlistItem[];
  } catch {
    return [];
  }
}

export function addToWatchlist(item: WatchlistItem): void {
  if (typeof window === "undefined") return;
  const list = getWatchlist();
  if (list.some((i) => i.ticker === item.ticker)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([item, ...list]));
}

export function removeFromWatchlist(ticker: string): void {
  if (typeof window === "undefined") return;
  const list = getWatchlist().filter((i) => i.ticker !== ticker);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function isInWatchlist(ticker: string): boolean {
  return getWatchlist().some((i) => i.ticker === ticker);
}
