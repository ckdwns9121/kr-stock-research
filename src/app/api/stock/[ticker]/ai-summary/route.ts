import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchNaverMetrics, fetchCompanyNews, fetchStockSummary } from "@/lib/api/naver";
import { getCorpCode, fetchFinancialStatements } from "@/lib/api/dart";
import { fetchCompanyIndustry } from "@/lib/api/dart-industry";
import { DART_BASE_URL } from "@/lib/constants";
import { fetchWithTimeout } from "@/lib/api/client";
import type { NewsItem } from "@/types/news";

interface AISummaryResponse {
  analysis: {
    companyOverview: string;
    mainProducts: string;
    businessModel: string;
    financialAnalysis: string;
    summary: string;
    opinion: string;
    targetPrice: number;
    buyPrice: number;
    targetReasoning: string;
    buyReasoning: string;
    risks: string;
    opportunities: string;
  } | null;
  news: { title: string; url: string }[];
  companyInfo: {
    industry: string;
    ceo: string;
    established: string;
    homepage: string;
  } | null;
  error?: string;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<string, { data: AISummaryResponse; timestamp: number }>();
const DART_API_KEY = process.env.DART_API_KEY ?? "";

const SYSTEM_PROMPT = `당신은 20년차 한국 주식 시장 수석 애널리스트입니다. 제공된 기업정보, 재무데이터, 최신 뉴스를 바탕으로 이 회사에 대한 종합 기업 분석 리포트를 작성하세요.

중요: 목표가와 매수가는 반드시 제공된 현재가와 같은 단위(원)로 작성하세요. 현재가가 20,000원이면 목표가도 20,000원대여야 합니다.

반드시 JSON으로만 응답하세요:
{
  "companyOverview": "이 회사가 뭐하는 회사인지 2-3문장. 업종, 주요 사업 영역, 시장 내 위치를 명확히 설명",
  "mainProducts": "실제 제품명/브랜드명으로 3-5개 나열. 추상적 카테고리(전자부품, 반도체 모듈 등) 금지. 예: 1) HBM3E (고대역폭 메모리) 2) DDR5 DRAM 3) 176단 V-NAND. 제품명이 없으면 구체적 모델명/시리즈명으로",
  "businessModel": "어떻게 돈을 버는지 2-3문장. 매출 비중(예: 반도체 55%, 모바일 25%) + 주요 고객사 실명 포함(예: 삼성전자, TSMC, 현대차, 애플 등). 납품처/거래처가 있으면 반드시 명시",
  "financialAnalysis": "재무 상태 분석 2-3문장. 매출/이익 트렌드, 수익성(영업이익률), 재무 건전성을 수치와 함께",
  "summary": "종합 투자 판단 2-3문장. 밸류에이션, 성장성, 뉴스 영향을 근거와 수치로",
  "opinion": "매수" | "중립" | "매도",
  "targetPrice": 목표주가(숫자, 원 단위, 현재가 기준 ±10~30% 범위),
  "buyPrice": 추천매수가(숫자, 원 단위, 현재가 대비 5~15% 할인),
  "targetReasoning": "목표가 산출 근거 2-3문장",
  "buyReasoning": "매수가 산출 근거 1-2문장",
  "risks": "핵심 리스크 3가지, 각 1문장",
  "opportunities": "핵심 기회 요인 3가지, 각 1문장"
}`;

interface DartCompanyResponse {
  status: string;
  corp_name?: string;
  ceo_nm?: string;
  induty_code?: string;
  est_dt?: string;
  hm_url?: string;
  adres?: string;
}

async function fetchDartCompanyInfo(corpCode: string): Promise<DartCompanyResponse | null> {
  if (!DART_API_KEY) return null;
  const result = await fetchWithTimeout<DartCompanyResponse>(
    `${DART_BASE_URL}/company.json?crtfc_key=${DART_API_KEY}&corp_code=${corpCode}`,
    { parseAs: "json", timeoutMs: 5000, cacheKey: `dart-company-${corpCode}`, staleTTL: 86400_000 }
  );
  return result.data?.status === "000" ? result.data : null;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ analysis: null, news: [], companyInfo: null, error: "OPENAI_API_KEY 미설정" });
  }

  const now = Date.now();
  const cached = cache.get(ticker);
  if (cached && now - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  // 모든 데이터 병렬 수집
  const [metrics, corpCode, news, summary] = await Promise.all([
    fetchNaverMetrics(ticker).catch(() => null),
    getCorpCode(ticker).catch(() => null),
    fetchCompanyNews(ticker).catch(() => [] as NewsItem[]),
    fetchStockSummary(ticker).catch(() => null),
  ]);

  // DART 기업개황 + 재무제표 (corpCode 필요)
  let dartCompany: DartCompanyResponse | null = null;
  let industryName = "";
  const financialLines: string[] = [];

  if (corpCode) {
    const [companyResult, industryResult] = await Promise.all([
      fetchDartCompanyInfo(corpCode).catch(() => null),
      fetchCompanyIndustry(corpCode).catch(() => null),
    ]);
    dartCompany = companyResult;
    industryName = industryResult?.industryName ?? "";

    // 최근 2년 재무제표
    try {
      const thisYear = new Date().getFullYear();
      const [statementsThisYear, statementsLastYear] = await Promise.all([
        fetchFinancialStatements(corpCode, thisYear - 1).catch(() => []),
        fetchFinancialStatements(corpCode, thisYear - 2).catch(() => []),
      ]);
      const allStatements = [...statementsLastYear, ...statementsThisYear];

      const fmt = (n: number) => n ? `${(n / 1_000_000_000).toFixed(0)}억원` : "N/A";

      for (const s of allStatements) {
        const q = s.quarter ?? "";
        const margin = s.revenue > 0 ? ((s.operatingProfit / s.revenue) * 100).toFixed(1) : "N/A";
        financialLines.push(
          `${q}${q.includes("사업") ? `(${thisYear - 1})` : ""}: 매출 ${fmt(s.revenue)} / 영업이익 ${fmt(s.operatingProfit)} (영업이익률 ${margin}%) / 순이익 ${fmt(s.netProfit)}`
        );
      }
    } catch { /* ignore */ }
  }

  // 프롬프트 데이터 구성
  const dataLines: string[] = [];

  if (summary) {
    dataLines.push(`현재가: ${summary.currentPrice.toLocaleString()}원`);
    dataLines.push(`등락률: ${summary.changePercent >= 0 ? "+" : ""}${summary.changePercent.toFixed(2)}%`);
    if (summary.marketCap) dataLines.push(`시가총액: ${(summary.marketCap / 1_0000).toFixed(0)}억원`);
  }
  if (metrics) {
    if (metrics.per) dataLines.push(`PER: ${metrics.per.toFixed(1)}배`);
    if (metrics.pbr) dataLines.push(`PBR: ${metrics.pbr.toFixed(2)}배`);
    if (metrics.roe) dataLines.push(`ROE: ${metrics.roe.toFixed(1)}%`);
  }

  const companyLines: string[] = [];
  if (dartCompany) {
    if (dartCompany.corp_name) companyLines.push(`회사명: ${dartCompany.corp_name}`);
    if (dartCompany.ceo_nm) companyLines.push(`대표이사: ${dartCompany.ceo_nm}`);
    if (dartCompany.est_dt) companyLines.push(`설립일: ${dartCompany.est_dt.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")}`);
    if (industryName) companyLines.push(`업종: ${industryName}`);
    if (dartCompany.adres) companyLines.push(`소재지: ${dartCompany.adres}`);
    if (dartCompany.hm_url) companyLines.push(`홈페이지: ${dartCompany.hm_url}`);
  }

  const newsForAI = news.slice(0, 7).map((n) => `- ${n.title}`);
  const newsForClient = news.slice(0, 10).map((n) => ({ title: n.title, url: n.url }));

  const userMessage = `종목코드: ${ticker}${summary ? ` (${summary.name})` : ""}

${companyLines.length > 0 ? `[기업 개요]\n${companyLines.join("\n")}` : ""}

${dataLines.length > 0 ? `[시장 데이터]\n${dataLines.join("\n")}` : "[시장 데이터 없음]"}

${financialLines.length > 0 ? `[재무제표 (최근 2년)]\n${financialLines.join("\n")}` : "[재무 데이터 없음]"}

${newsForAI.length > 0 ? `[최신 뉴스]\n${newsForAI.join("\n")}` : "[뉴스 없음]"}`;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const result: AISummaryResponse = {
      analysis: {
        companyOverview: typeof parsed.companyOverview === "string" ? parsed.companyOverview : "",
        mainProducts: typeof parsed.mainProducts === "string" ? parsed.mainProducts : "",
        businessModel: typeof parsed.businessModel === "string" ? parsed.businessModel : "",
        financialAnalysis: typeof parsed.financialAnalysis === "string" ? parsed.financialAnalysis : "",
        summary: typeof parsed.summary === "string" ? parsed.summary : "",
        opinion: parsed.opinion === "매수" || parsed.opinion === "중립" || parsed.opinion === "매도" ? parsed.opinion : "중립",
        targetPrice: typeof parsed.targetPrice === "number" ? parsed.targetPrice : 0,
        buyPrice: typeof parsed.buyPrice === "number" ? parsed.buyPrice : 0,
        targetReasoning: typeof parsed.targetReasoning === "string" ? parsed.targetReasoning : "",
        buyReasoning: typeof parsed.buyReasoning === "string" ? parsed.buyReasoning : "",
        risks: typeof parsed.risks === "string" ? parsed.risks : "",
        opportunities: typeof parsed.opportunities === "string" ? parsed.opportunities : "",
      },
      news: newsForClient,
      companyInfo: dartCompany ? {
        industry: industryName,
        ceo: dartCompany.ceo_nm ?? "",
        established: dartCompany.est_dt ? dartCompany.est_dt.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3") : "",
        homepage: dartCompany.hm_url ?? "",
      } : null,
    };

    cache.set(ticker, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ analysis: null, news: newsForClient, companyInfo: null, error: "AI 분석 생성 실패" });
  }
}
