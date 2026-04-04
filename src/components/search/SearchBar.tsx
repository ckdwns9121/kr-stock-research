"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSearch } from "@/hooks/useSearch";
import { SearchResults } from "./SearchResults";

interface SearchBarProps {
  placeholder?: string;
}

export function SearchBar({ placeholder = "종목명 또는 티커 검색" }: SearchBarProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, isLoading } = useSearch(query);

  const handleSelect = (ticker: string) => {
    setQuery("");
    setIsFocused(false);
    inputRef.current?.blur();
    router.push(`/stock/${ticker}`);
  };

  const showDropdown = isFocused && query.trim().length > 0;

  return (
    <div className="relative w-full">
      <div
        className={`flex items-center gap-3 w-full bg-toss-gray-100 rounded-2xl px-4 py-3 transition-all ${
          isFocused
            ? "ring-2 ring-toss-blue bg-white"
            : "hover:bg-toss-gray-200"
        }`}
      >
        {/* Magnifying glass icon */}
        <svg
          className={`w-5 h-5 shrink-0 transition-colors ${
            isFocused ? "text-toss-blue" : "text-toss-gray-400"
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
          />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && results.length > 0) {
              handleSelect(results[0].ticker);
            }
            if (e.key === "Escape") {
              setQuery("");
              inputRef.current?.blur();
            }
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm text-toss-gray-900 placeholder:text-toss-gray-400 outline-none"
          autoComplete="off"
        />

        {isLoading && (
          <svg
            className="w-4 h-4 shrink-0 text-toss-gray-400 animate-spin"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
            />
          </svg>
        )}

        {query && !isLoading && (
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              setQuery("");
            }}
            className="shrink-0 text-toss-gray-400 hover:text-toss-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {showDropdown && (
        <SearchResults results={results} onSelect={handleSelect} />
      )}
    </div>
  );
}
