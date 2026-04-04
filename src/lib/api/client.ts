import { DEFAULT_HEADERS } from "@/lib/constants";

export interface FetchResult<T> {
  data: T | null;
  stale: boolean;
  cachedAt?: number;
  error?: string;
}

const staleCache = new Map<string, { data: unknown; timestamp: number }>();

export async function fetchWithTimeout<T>(
  url: string,
  options: RequestInit & {
    timeoutMs?: number;
    cacheKey?: string;
    staleTTL?: number;
    parseAs?: "json" | "text";
  } = {}
): Promise<FetchResult<T>> {
  const {
    timeoutMs = 3000,
    cacheKey,
    staleTTL = 600_000,
    parseAs = "json",
    ...fetchOpts
  } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    ...DEFAULT_HEADERS,
    ...(fetchOpts.headers as Record<string, string>),
  };

  try {
    const res = await fetch(url, {
      ...fetchOpts,
      headers,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} ${res.statusText}`);
    }

    const data =
      parseAs === "text"
        ? ((await res.text()) as unknown as T)
        : ((await res.json()) as T);

    if (cacheKey) {
      staleCache.set(cacheKey, { data, timestamp: Date.now() });
      if (staleCache.size > 500) {
        const oldest = staleCache.keys().next().value;
        if (oldest) staleCache.delete(oldest);
      }
    }

    return { data, stale: false };
  } catch (err) {
    clearTimeout(timer);

    if (cacheKey) {
      const cached = staleCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < staleTTL) {
        return {
          data: cached.data as T,
          stale: true,
          cachedAt: cached.timestamp,
        };
      }
    }

    return { data: null, stale: false, error: String(err) };
  }
}

function detectCharset(
  contentType: string | null,
  body: ArrayBuffer
): string {
  // 1. Check Content-Type header for charset
  if (contentType) {
    const match = contentType.match(/charset\s*=\s*([\w-]+)/i);
    if (match) {
      const charset = match[1].toLowerCase();
      if (charset === "euc-kr" || charset === "euckr") return "euc-kr";
      if (charset === "utf-8" || charset === "utf8") return "utf-8";
      return charset;
    }
  }

  // 2. Peek at raw bytes for HTML meta charset tag
  //    Decode a small prefix as ASCII to find <meta charset="..."> or
  //    <meta http-equiv="Content-Type" content="...charset=...">
  const preview = new TextDecoder("ascii", { fatal: false }).decode(
    body.slice(0, 2048)
  );
  const metaCharset = preview.match(
    /<meta[^>]+charset\s*=\s*["']?([\w-]+)/i
  );
  if (metaCharset) {
    const charset = metaCharset[1].toLowerCase();
    if (charset === "euc-kr" || charset === "euckr") return "euc-kr";
    if (charset === "utf-8" || charset === "utf8") return "utf-8";
    return charset;
  }

  // 3. Default to UTF-8 (modern web standard)
  return "utf-8";
}

export async function fetchHTML(
  url: string,
  options: { timeoutMs?: number; cacheKey?: string; staleTTL?: number } = {}
): Promise<FetchResult<string>> {
  const { timeoutMs = 3000, cacheKey, staleTTL = 600_000 } = options;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const buffer = await res.arrayBuffer();
    const charset = detectCharset(res.headers.get("content-type"), buffer);
    const text = new TextDecoder(charset, { fatal: false }).decode(buffer);

    if (cacheKey) {
      staleCache.set(cacheKey, { data: text, timestamp: Date.now() });
      if (staleCache.size > 500) {
        const oldest = staleCache.keys().next().value;
        if (oldest) staleCache.delete(oldest);
      }
    }
    return { data: text, stale: false };
  } catch (err) {
    clearTimeout(timer);
    if (cacheKey) {
      const cached = staleCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < staleTTL) {
        return { data: cached.data as string, stale: true, cachedAt: cached.timestamp };
      }
    }
    return { data: null, stale: false, error: String(err) };
  }
}
