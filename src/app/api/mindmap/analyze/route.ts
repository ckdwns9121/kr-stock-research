import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { fetchStockSummary, fetchCompanyNews, fetchNaverMetrics } from "@/lib/api/naver";
import { fetchMarketNews } from "@/lib/api/naver";

export const dynamic = "force-dynamic";

interface NodeInput {
  id: string;
  label: string;
  type: string;
  role?: string;
  ticker?: string;
  description?: string;
}

interface EdgeInput {
  from: string;
  to: string;
  label?: string;
}

interface AnalysisResponse {
  report: {
    themeSummary: string;
    topPicks: { name: string; ticker: string; reason: string }[];
    chainAnalysis: string;
    riskChain: string;
    investStrategy: string;
  } | null;
  error?: string;
}

const SYSTEM_PROMPT = `당신은 20년차 한국 주식 시장 밸류체인 분석 전문가입니다. 제공된 밸류체인 그래프(노드+엣지)와 실시간 시장 데이터를 바탕으로 종합 분석 리포트를 작성하세요.

중요: 반드시 제공된 실시간 데이터(주가, 뉴스, PER/PBR)를 근거로 사용하세요. 추측이 아닌 사실 기반으로 작성하세요.

반드시 한국어로, JSON으로만 응답하세요:
{
  "themeSummary": "이 밸류체인의 현재 상황 요약 3-4문장. 최신 뉴스와 시장 데이터를 근거로 포함",
  "topPicks": [
    {"name": "종목명", "ticker": "종목코드", "reason": "왜 핵심 수혜주인지 2-3문장. 실제 재무 수치와 밸류체인 내 위치를 근거로"}
  ],
  "chainAnalysis": "꼬리에 꼬리를 무는 분석 5-8문장. 예: A가 성장하면 → B에 납품이 늘어나고 → B의 매출이 오르면 → C 장비 수요 증가 → ... 실제 기업명과 제품명으로 구체적으로. 최신 뉴스가 있으면 반영",
  "riskChain": "이 밸류체인의 취약점 3-4문장. 어디가 끊기면 전체가 흔들리는지, 현재 리스크 요인은 무엇인지",
  "investStrategy": "이 밸류체인에 투자한다면 어떻게? 3-4문장. 핵심 종목 비중, 진입 시점, 주의사항"
}

topPicks는 3-5개, 밸류체인에서 가장 돈을 많이 벌 수 있는 순서로 정렬.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ report: null, error: "OPENAI_API_KEY 미설정" });
  }

  let body: { nodes: NodeInput[]; edges: EdgeInput[]; theme: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ report: null, error: "잘못된 요청" });
  }

  const { nodes, edges, theme } = body;
  const companyNodes = nodes.filter((n) => n.type === "company" && n.ticker);

  // 종목별 실시간 데이터 수집 (병렬)
  const stockDataPromises = companyNodes.slice(0, 15).map(async (node) => {
    const [summary, metrics, news] = await Promise.all([
      fetchStockSummary(node.ticker!).catch(() => null),
      fetchNaverMetrics(node.ticker!).catch(() => null),
      fetchCompanyNews(node.ticker!).catch(() => []),
    ]);

    const lines: string[] = [`[${node.label}] (${node.ticker})`];
    if (summary) {
      lines.push(`현재가: ${summary.currentPrice.toLocaleString()}원 (${summary.changePercent >= 0 ? "+" : ""}${summary.changePercent.toFixed(2)}%)`);
    }
    if (metrics) {
      if (metrics.per) lines.push(`PER: ${metrics.per.toFixed(1)}배`);
      if (metrics.pbr) lines.push(`PBR: ${metrics.pbr.toFixed(2)}배`);
      if (metrics.roe) lines.push(`ROE: ${metrics.roe.toFixed(1)}%`);
    }
    if (news.length > 0) {
      lines.push(`최신뉴스: ${news.slice(0, 3).map((n) => n.title).join(" / ")}`);
    }
    return lines.join("\n");
  });

  const stockData = await Promise.all(stockDataPromises);

  // 시장 뉴스
  const marketNews = await fetchMarketNews().catch(() => []);
  const marketNewsStr = marketNews.slice(0, 5).map((n) => `- ${n.title}`).join("\n");

  // 밸류체인 구조 텍스트화
  const chainStr = edges.map((e) => {
    const fromNode = nodes.find((n) => n.id === e.from);
    const toNode = nodes.find((n) => n.id === e.to);
    return `${fromNode?.label ?? e.from} → ${toNode?.label ?? e.to}: ${e.label ?? "연결"}`;
  }).join("\n");

  const userMessage = `테마: ${theme}

[밸류체인 구조 (${nodes.length}개 노드, ${edges.length}개 연결)]
${chainStr}

[종목별 실시간 데이터]
${stockData.join("\n\n")}

[최신 시장 뉴스]
${marketNewsStr || "뉴스 없음"}`;

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.4,
      max_tokens: 2500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const report: AnalysisResponse["report"] = {
      themeSummary: typeof parsed.themeSummary === "string" ? parsed.themeSummary : "",
      topPicks: Array.isArray(parsed.topPicks) ? parsed.topPicks.map((p: Record<string, unknown>) => ({
        name: String(p.name ?? ""),
        ticker: String(p.ticker ?? ""),
        reason: String(p.reason ?? ""),
      })) : [],
      chainAnalysis: typeof parsed.chainAnalysis === "string" ? parsed.chainAnalysis : "",
      riskChain: typeof parsed.riskChain === "string" ? parsed.riskChain : "",
      investStrategy: typeof parsed.investStrategy === "string" ? parsed.investStrategy : "",
    };

    return NextResponse.json({ report });
  } catch {
    return NextResponse.json({ report: null, error: "분석 생성 실패" });
  }
}
