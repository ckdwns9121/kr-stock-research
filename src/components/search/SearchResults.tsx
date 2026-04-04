"use client";

import type { Stock } from "@/types/stock";

interface SearchResultsProps {
  results: Stock[];
  onSelect: (ticker: string) => void;
}

export function SearchResults({ results, onSelect }: SearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <ul className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl shadow-card-hover border border-toss-gray-200 overflow-hidden z-50">
      {results.map((stock) => (
        <li key={stock.ticker}>
          <button
            type="button"
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-toss-gray-50 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              onSelect(stock.ticker);
            }}
          >
            <span className="text-sm font-medium text-toss-gray-900">
              {stock.name}
            </span>
            <span className="text-xs text-toss-gray-500 ml-2 shrink-0">
              {stock.ticker}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
