import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

interface MindMapNode {
  id: string;
  label: string;
  type: "theme" | "industry" | "company";
  role: "upstream" | "core" | "downstream" | "theme";
  ticker?: string;
  description?: string;
}

interface MindMapEdge {
  from: string;
  to: string;
  label?: string;
  flowType?: "supply" | "product" | "service" | "demand";
}

interface MindMapResponse {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  error?: string;
}

const CACHE_TTL = 60 * 60 * 1000; // 1시간
const cache = new Map<string, { data: MindMapResponse; timestamp: number }>();

const SYSTEM_PROMPT = `당신은 한국 주식 시장의 밸류체인/공급망 분석 전문가입니다. 사용자가 제시한 테마를 기반으로 실제 돈과 제품의 흐름(Upstream → Core → Downstream)을 따라 밸류체인을 구성하세요.

중요: "관련 테마 묶음"이 아니라 실제 공급망/수요망 흐름도입니다.
- Upstream (공급): 원재료, 부품, 장비, 인프라를 제공하는 산업/기업
- Core (핵심): 이 테마의 핵심 제품/서비스를 만드는 산업/기업
- Downstream (수요): 핵심 제품을 구매/활용하는 산업/기업 (고객사)

반드시 JSON으로만 응답하세요:
{
  "nodes": [
    {"id": "고유ID", "label": "표시명", "type": "theme|industry|company", "role": "upstream|core|downstream|theme", "ticker": "6자리코드(company만)", "description": "역할 한줄설명"}
  ],
  "edges": [
    {"from": "공급자ID", "to": "수요자ID", "label": "무엇을 공급/납품하는지", "flowType": "supply|product|service|demand"}
  ]
}

규칙:
1. 중심 테마 노드 1개 (type: "theme", role: "theme")
2. Upstream 산업 3-4개 + 각 산업별 종목 2-3개 (role: "upstream")
3. Core 산업 2-3개 + 각 산업별 종목 2-3개 (role: "core")
4. Downstream 산업 2-3개 + 각 산업별 종목 2-3개 (role: "downstream")
5. edge 방향 = 돈/제품 흐름 방향 (from=공급자 → to=수요자). flowType으로 구분:
   - supply: 원재료/부품 공급
   - product: 완제품 납품
   - service: 서비스 제공
   - demand: 최종 수요/구매
6. 반드시 실존 한국 상장 종목 (종목코드 6자리 필수), 코스피+코스닥 혼합
7. 대형주만 나열 금지. 중소형 핵심 부품사/장비사도 반드시 포함
8. edge의 label은 구체적으로 (예: "반도체 웨이퍼 공급", "OLED 패널 납품", "클라우드 인프라 구매")
9. 총 노드 25-40개, edge 25-50개
10. 절대 종목을 잘못 분류하지 마세요. 셀트리온/셀트리온헬스케어는 바이오, 삼성전자는 반도체/가전, 현대차는 자동차입니다. 해당 테마와 실제 사업이 무관한 종목은 포함하지 마세요.
11. 확실하지 않은 종목은 넣지 마세요. 틀린 정보보다 적은 정보가 낫습니다.`;

export async function GET(request: NextRequest) {
  const theme = request.nextUrl.searchParams.get("theme")?.trim();
  if (!theme) {
    return NextResponse.json({ nodes: [], edges: [], error: "테마를 입력하세요" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ nodes: [], edges: [], error: "OPENAI_API_KEY 미설정" });
  }

  const now = Date.now();
  const cached = cache.get(theme);
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return NextResponse.json(cached.data);
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `테마: ${theme}` },
      ],
      temperature: 0.5,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    const result: MindMapResponse = {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };

    cache.set(theme, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ nodes: [], edges: [], error: "마인드맵 생성 실패" });
  }
}
