export interface AIFeedback {
  score: number;
  pros: string[];
  cons: string[];
  summary: string;
  modelAnswer?: string;
  studyGuide?: string[];
}

export interface AnalysisEntry {
  id: string;
  ticker: string;
  companyName: string;
  date: string; // ISO string
  myAnalysis: string;
  aiScore: number;
  aiFeedback: AIFeedback;
}

const STORAGE_KEY = "kr-stock-analysis-history";
const MAX_ENTRIES = 50;

export function getAnalyses(): AnalysisEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AnalysisEntry[];
    // 최신순 정렬
    return parsed.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch {
    return [];
  }
}

export function saveAnalysis(entry: AnalysisEntry): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getAnalyses();
    const updated = [entry, ...existing.filter((e) => e.id !== entry.id)];
    // 최대 50개 유지
    const trimmed = updated.slice(0, MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage 쓰기 실패 무시
  }
}

export function deleteAnalysis(id: string): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getAnalyses();
    const updated = existing.filter((e) => e.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // localStorage 쓰기 실패 무시
  }
}
