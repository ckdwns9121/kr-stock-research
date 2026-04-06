import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchNaverMetrics, fetchCompanyNews, fetchMarketNews } from "@/lib/api/naver";
import { getCorpCode, fetchFinancialStatements } from "@/lib/api/dart";

interface AnalysisRequest {
  ticker: string;
  myAnalysis: string;
  companyName?: string;
}

interface AnalysisResponse {
  score: number;
  pros: string[];
  cons: string[];
  summary: string;
  modelAnswer: string;
  studyGuide: string[];
}

const SYSTEM_PROMPT = `당신은 20년차 한국 주식 시장 수석 애널리스트이자 교육 코치입니다. 학습자의 종목 분석문을 읽고, 실제 재무데이터와 비교하여 평가한 뒤 모범 답안을 제시합니다.

평가 기준:
- 밸류에이션 언급 여부 (PER/PBR/PEG 등)
- 실적 추세 분석 여부 (매출/영업이익 방향)
- 리스크 요인 언급 여부
- 산업/경쟁사 컨텍스트 포함 여부
- 논리적 일관성
- 매크로 환경(금리, 환율, 글로벌 시황) 고려 여부

반드시 JSON으로만 응답하세요. 다른 텍스트 없이 JSON만:
{
  "score": 0-100,
  "pros": ["잘 분석한 점1", "잘 분석한 점2"],
  "cons": ["미검토 항목1", "미검토 항목2"],
  "summary": "종합 코멘트 2-3문장",
  "modelAnswer": "20년차 애널리스트로서 이 종목에 대한 모범 분석 (5-8문장). 제공된 재무데이터, 최신 뉴스, 산업 동향, 밸류에이션, 리스크/기회 요인을 근거와 수치를 들어 논리적으로 분석하고 투자 의견을 제시. 최신 뉴스가 제공된 경우 반드시 뉴스 내용을 근거로 활용하여 현재 시장 상황을 반영.",
  "studyGuide": ["이 종목을 더 잘 분석하기 위해 공부해야 할 구체적 주제 3-5개. 예: 반도체 업황 사이클 이해, PEG 비율 활용법 등"]
}`;

async function buildFinancialContext(ticker: string): Promise<string> {
  try {
    const [metrics, corpCode] = await Promise.all([
      fetchNaverMetrics(ticker),
      getCorpCode(ticker),
    ]);

    const lines: string[] = [];

    if (metrics) {
      if (metrics.per) lines.push(`PER: ${metrics.per.toFixed(1)}배`);
      if (metrics.pbr) lines.push(`PBR: ${metrics.pbr.toFixed(2)}배`);
      if (metrics.roe) lines.push(`ROE: ${metrics.roe.toFixed(1)}%`);
    }

    if (corpCode) {
      const year = new Date().getFullYear() - 1;
      const statements = await fetchFinancialStatements(corpCode, year);
      const annual = statements.find((s) => s.quarter === "사업보고서");
      if (annual) {
        const fmt = (n: number) =>
          n ? `${(n / 1_000_000_000).toFixed(0)}억원` : "N/A";
        lines.push(`매출액(${year}): ${fmt(annual.revenue)}`);
        lines.push(`영업이익(${year}): ${fmt(annual.operatingProfit)}`);
        lines.push(`순이익(${year}): ${fmt(annual.netProfit)}`);
        lines.push(`자산총계: ${fmt(annual.totalAssets)}`);
        lines.push(`부채총계: ${fmt(annual.totalLiabilities)}`);
      }
    }

    if (lines.length === 0) return "";
    return `\n\n[실제 재무데이터]\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY가 설정되지 않았습니다. .env.local 파일에 키를 추가해주세요." },
      { status: 400 }
    );
  }

  let body: AnalysisRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { ticker, myAnalysis, companyName } = body;
  if (!ticker || !myAnalysis?.trim()) {
    return NextResponse.json(
      { error: "ticker와 myAnalysis는 필수입니다." },
      { status: 400 }
    );
  }

  // 재무데이터 + 뉴스 병렬 조회 (실패해도 계속 진행)
  const [financialContext, companyNews, marketNews] = await Promise.all([
    buildFinancialContext(ticker),
    fetchCompanyNews(ticker).catch(() => []),
    fetchMarketNews().catch(() => []),
  ]);

  const newsContext = [
    ...companyNews.slice(0, 5).map((n) => `- [종목] ${n.title}`),
    ...marketNews.slice(0, 5).map((n) => `- [시장] ${n.title}`),
  ];

  const userMessage = `종목: ${companyName ?? ticker} (${ticker})${financialContext}${
    newsContext.length > 0 ? `\n\n[최신 뉴스]\n${newsContext.join("\n")}` : ""
  }

[학습자 분석]
${myAnalysis.trim()}`;

  const client = new OpenAI({ apiKey });

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as Partial<AnalysisResponse>;

    const result: AnalysisResponse = {
      score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 50,
      pros: Array.isArray(parsed.pros) ? parsed.pros : [],
      cons: Array.isArray(parsed.cons) ? parsed.cons : [],
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      modelAnswer: typeof parsed.modelAnswer === "string" ? parsed.modelAnswer : "",
      studyGuide: Array.isArray(parsed.studyGuide) ? parsed.studyGuide : [],
    };

    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI 평가 중 오류가 발생했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
