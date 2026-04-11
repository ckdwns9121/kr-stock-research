"use client";

import { useState, useEffect, useCallback } from "react";
import { addToWatchlist, removeFromWatchlist, isInWatchlist } from "@/lib/watchlist-storage";
import { Toast } from "@/components/ui/Toast";

interface WatchlistButtonProps {
  ticker: string;
  name: string;
}

export function WatchlistButton({ ticker, name }: WatchlistButtonProps) {
  const [added, setAdded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });

  useEffect(() => {
    setAdded(isInWatchlist(ticker));
  }, [ticker]);

  const hideToast = useCallback(() => setToast({ visible: false, message: "" }), []);

  async function handleToggle() {
    if (added) {
      removeFromWatchlist(ticker);
      setAdded(false);
      setToast({ visible: true, message: `${name} 관심종목에서 삭제됨` });
      return;
    }

    setLoading(true);
    let sector = "기타";
    try {
      const res = await fetch(`/api/stock/${ticker}/peers`);
      const data = await res.json();
      sector = data.sectorName ?? "기타";
    } catch { /* fallback */ }

    addToWatchlist({
      ticker,
      name,
      sector,
      addedAt: new Date().toISOString(),
    });
    setAdded(true);
    setLoading(false);
    setToast({ visible: true, message: `${name} → ${sector} 카테고리로 추가됨` });
  }

  return (
    <>
      <button
        onClick={handleToggle}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
          added
            ? "bg-toss-red/15 text-toss-red hover:bg-toss-red/25"
            : "bg-dark-elevated text-dark-text-secondary hover:text-dark-text-primary"
        }`}
      >
        {loading ? (
          "분류 중..."
        ) : added ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            관심종목
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
            관심종목 추가
          </>
        )}
      </button>
      <Toast message={toast.message} visible={toast.visible} onClose={hideToast} />
    </>
  );
}
