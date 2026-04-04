# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Korean stock research web app ("국내 주식 리서치") — aggregates stock prices, financial statements, news, and market indices from Korean financial data sources. Built with Next.js 14 App Router, TypeScript, and Tailwind CSS.

## Commands

- `npm run dev` — start dev server (localhost:3000)
- `npm run build` — production build
- `npm run lint` — ESLint
- No test framework is configured.

## Environment

Requires `.env.local` with `DART_API_KEY` (from [DART OpenAPI](https://opendart.fss.or.kr/)). Copy `.env.example` as a starting point.

`NEXT_PUBLIC_BASE_URL` can be set for production; defaults to `http://localhost:3000`.

## Architecture

### Data Flow

The app scrapes external Korean financial websites server-side — it does **not** use official REST APIs for most data. Understanding this is critical:

- **Naver Finance** (`src/lib/api/naver.ts`) — HTML scraping with cheerio for stock prices, metrics (PER/PBR), chart data, news, and market indices (KOSPI/KOSDAQ). Naver Finance uses **euc-kr encoding**, handled in `client.ts` via `TextDecoder("euc-kr")`.
- **DART** (`src/lib/api/dart.ts`) — Official government API for financial statements (income statement, balance sheet). Requires API key. Uses corp-code mapping from `src/data/corp-codes.json` (ticker ↔ DART corp_code).
- **KRX** (`src/lib/api/krx.ts`) — Stock list lookup from the corp-codes JSON (not live KRX API).

### Resilience Layer

`src/lib/api/client.ts` provides `fetchWithTimeout` and `fetchHTML` with:
- Configurable timeout (default 3s)
- In-memory stale-while-revalidate cache (serves stale data on fetch failure within TTL)
- Cache size capped at 500 entries

All API modules return `null` or `[]` on failure rather than throwing — the UI gracefully degrades.

### API Routes

Next.js Route Handlers under `src/app/api/` wrap the scraping modules:
- `/api/stock/[ticker]/chart` — OHLCV chart data
- `/api/stock/[ticker]/financials` — DART financial statements
- `/api/stock/[ticker]/metrics` — PER, PBR, ROE
- `/api/stock/[ticker]/news` — company news
- `/api/stock/overview` — KOSPI/KOSDAQ indices
- `/api/news` — market news feed
- `/api/search` — stock name/ticker search

### Pages

- `/` — home with search, market overview, recent news
- `/stock/[ticker]` — stock detail (header, chart, metrics, financials, news). Chart uses `lightweight-charts` loaded via `next/dynamic` (client-only).
- `/news` — full news feed

### Key Patterns

- Stock detail page fetches all data in parallel via `Promise.allSettled` so one failing source doesn't block others.
- Next.js `revalidate` is used on fetch calls for ISR-style caching (120s for news, 300s for prices, 3600s for financials).
- Components are organized by domain: `market/`, `stock/`, `news/`, `search/`, `ui/`, `layout/`.
- Types are in `src/types/` (stock, financial, market, news) and `src/lib/api/types.ts` (API-layer types).
