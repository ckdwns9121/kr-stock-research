import { DART_BASE_URL } from "@/lib/constants";
import { fetchWithTimeout } from "./client";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const DART_API_KEY = process.env.DART_API_KEY ?? "";
const CACHE_FILE = path.join(process.cwd(), "src/data/industry-cache.json");
const FILE_TTL = 7 * 24 * 60 * 60 * 1000; // 7일 (업종코드는 자주 안 바뀜)
const BATCH_DELAY = 100; // ms (DART 일 10,000건 제한 고려)

// 한국표준산업분류 코드 → 섹터명 매핑 (주요 대분류)
const INDUSTRY_SECTOR_MAP: Record<string, string> = {
  "26": "반도체·전자",
  "27": "의료·정밀기기",
  "21": "제약·바이오",
  "29": "자동차",
  "30": "자동차부품",
  "24": "금속·소재",
  "20": "화학",
  "10": "식품",
  "14": "의류·패션",
  "58": "소프트웨어",
  "61": "통신",
  "62": "IT서비스",
  "63": "인터넷·플랫폼",
  "64": "금융",
  "65": "보험",
  "35": "에너지",
  "41": "건설",
  "49": "운송",
  "46": "도매·유통",
  "47": "소매·유통",
  "28": "전기장비",
  "25": "기계·장비",
  "31": "가구",
  "17": "종이·목재",
  "22": "고무·플라스틱",
  "23": "비금속광물",
};

function getSectorName(industryCode: string): string {
  if (!industryCode) return "기타";
  const prefix2 = industryCode.slice(0, 2);
  return INDUSTRY_SECTOR_MAP[prefix2] ?? "기타";
}

export interface IndustryInfo {
  corpCode: string;
  ticker: string;
  name: string;
  industryCode: string;
  sectorName: string;
  market: "KOSPI" | "KOSDAQ";
}

interface IndustryCache {
  data: Record<string, IndustryInfo>;
  timestamp: number;
}

interface CorpEntry {
  ticker: string;
  corpCode: string;
  market?: string;
}

let memoryCache: IndustryCache | null = null;

async function readFileCache(): Promise<IndustryCache | null> {
  try {
    const raw = await readFile(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as IndustryCache;
    if (Date.now() - parsed.timestamp < FILE_TTL) return parsed;
    return null;
  } catch {
    return null;
  }
}

async function writeFileCache(cache: IndustryCache): Promise<void> {
  try {
    await mkdir(path.dirname(CACHE_FILE), { recursive: true });
    await writeFile(CACHE_FILE, JSON.stringify(cache));
  } catch { /* ignore */ }
}

// 단일 종목 업종 조회
export async function fetchCompanyIndustry(corpCode: string): Promise<{ industryCode: string; industryName: string } | null> {
  if (!DART_API_KEY) return null;

  const result = await fetchWithTimeout<{
    status: string;
    induty_code?: string;
    corp_name?: string;
  }>(`${DART_BASE_URL}/company.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}`, {
    parseAs: "json",
    timeoutMs: 5000,
    cacheKey: `dart-company-${corpCode}`,
    staleTTL: 86400_000,
  });

  if (!result.data || result.data.status !== "000" || !result.data.induty_code) return null;

  const industryCode = result.data.induty_code;
  return {
    industryCode,
    industryName: getSectorName(industryCode),
  };
}

// 전종목 업종 맵 (캐시 기반)
export async function getIndustryMap(): Promise<Record<string, IndustryInfo>> {
  if (memoryCache && Date.now() - memoryCache.timestamp < FILE_TTL) {
    return memoryCache.data;
  }

  const fileCache = await readFileCache();
  if (fileCache) {
    memoryCache = fileCache;
    return fileCache.data;
  }

  // 캐시 없으면 빈 맵 반환 (buildIndustryCache로 별도 구축 필요)
  return {};
}

// 특정 종목의 동종업계 찾기
export async function findPeersByIndustry(ticker: string): Promise<IndustryInfo[]> {
  if (!DART_API_KEY) return [];

  const map = await getIndustryMap();
  const current = Object.values(map).find((v) => v.ticker === ticker);

  // 캐시에 있으면 같은 업종 찾기
  if (current) {
    return Object.values(map)
      .filter((v) => v.sectorName === current.sectorName && v.ticker !== ticker)
      .slice(0, 15);
  }

  // 캐시에 없으면 DART에서 직접 조회
  const corpCodes = await import("@/data/corp-codes.json");
  const entries = Object.entries(corpCodes.default as Record<string, CorpEntry>);
  const entry = entries.find(([, v]) => v.ticker === ticker);
  if (!entry) return [];

  const [name, { corpCode, market }] = entry;
  const industry = await fetchCompanyIndustry(corpCode);
  if (!industry) return [];

  const currentInfo: IndustryInfo = {
    corpCode,
    ticker,
    name,
    industryCode: industry.industryCode,
    sectorName: industry.industryName,
    market: (market === "KOSDAQ" ? "KOSDAQ" : "KOSPI") as "KOSPI" | "KOSDAQ",
  };

  // 같은 업종코드 2자리가 같은 종목 찾기
  const prefix = industry.industryCode.slice(0, 2);
  const peers: IndustryInfo[] = [];

  for (const [peerName, peerEntry] of entries) {
    if (peerEntry.ticker === ticker || peers.length >= 15) continue;

    // 캐시에 있으면 활용
    const cached = Object.values(map).find((v) => v.ticker === peerEntry.ticker);
    if (cached) {
      if (cached.industryCode.startsWith(prefix)) {
        peers.push(cached);
      }
      continue;
    }

    // DART에서 조회 (최대 20개까지만 시도)
    if (peers.length < 10) {
      const peerIndustry = await fetchCompanyIndustry(peerEntry.corpCode);
      if (peerIndustry && peerIndustry.industryCode.startsWith(prefix)) {
        peers.push({
          corpCode: peerEntry.corpCode,
          ticker: peerEntry.ticker,
          name: peerName,
          industryCode: peerIndustry.industryCode,
          sectorName: peerIndustry.industryName,
          market: (peerEntry.market === "KOSDAQ" ? "KOSDAQ" : "KOSPI") as "KOSPI" | "KOSDAQ",
        });
      }
      await new Promise((r) => setTimeout(r, BATCH_DELAY));
    }
  }

  // 현재 종목 + 피어를 캐시에 추가
  const updatedMap = await getIndustryMap();
  updatedMap[ticker] = currentInfo;
  for (const peer of peers) {
    updatedMap[peer.ticker] = peer;
  }
  const newCache: IndustryCache = { data: updatedMap, timestamp: Date.now() };
  memoryCache = newCache;
  writeFileCache(newCache).catch(() => {});

  return peers;
}

// 업종별 그룹핑 (섹터 페이지용)
export async function getIndustryGroups(): Promise<Array<{ sectorName: string; stocks: IndustryInfo[] }>> {
  const map = await getIndustryMap();
  const groups = new Map<string, IndustryInfo[]>();

  for (const info of Object.values(map)) {
    const existing = groups.get(info.sectorName) ?? [];
    existing.push(info);
    groups.set(info.sectorName, existing);
  }

  return Array.from(groups.entries())
    .map(([sectorName, stocks]) => ({ sectorName, stocks }))
    .sort((a, b) => b.stocks.length - a.stocks.length);
}
