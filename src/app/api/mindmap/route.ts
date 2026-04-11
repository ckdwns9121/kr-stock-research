import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

interface MindMapNode {
  id: string;
  label: string;
  type: "theme" | "industry" | "company";
  ticker?: string;
  description?: string;
}

interface MindMapEdge {
  from: string;
  to: string;
  label?: string;
}

interface MindMapResponse {
  nodes: MindMapNode[];
  edges: MindMapEdge[];
  error?: string;
}

const CACHE_TTL = 60 * 60 * 1000; // 1시간
const cache = new Map<string, { data: MindMapResponse; timestamp: number }>();

const SYSTEM_PROMPT = `당신은 한국 주식 시장의 밸류체인/공급망 전문가입니다. 사용자가 제시한 테마를 기반으로 관련 산업과 한국 상장 종목을 연결하는 마인드맵을 생성하세요.

반드시 JSON으로만 응답하세요:
{
  "nodes": [
    {"id": "고유ID", "label": "표시명", "type": "theme|industry|company", "ticker": "6자리코드(company만)", "description": "한줄설명"}
  ],
  "edges": [
    {"from": "노드ID", "to": "노드ID", "label": "관계설명"}
  ]
}

규칙:
1. 중심 테마 노드 1개 (type: "theme")
2. 관련 산업/카테고리 노드 5-8개 (type: "industry") — 밸류체인을 따라 연결
3. 각 산업별 실존 한국 상장 종목 2-4개 (type: "company") — 반드시 실제 종목코드 6자리 포함
4. 코스피+코스닥 혼합. 대형주만 나열하지 말고 중소형 핵심 기업도 포함
5. edge의 label에 "왜 이 산업이 필요한지" 간단히 설명 (예: "연산 처리 필요", "발열 해결 필요")
6. 꼬리에 꼬리를 무는 연결: 테마→산업→하위산업→기업, 산업→관련산업 등 다층 구조
7. description에 각 노드가 왜 이 테마와 관련되는지 한 줄로
8. 총 노드 수 25-40개, edge 수 25-50개`;

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
