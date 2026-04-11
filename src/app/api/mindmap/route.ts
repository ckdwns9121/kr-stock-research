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

interface CorpEntry {
  ticker: string;
  corpCode: string;
  market?: string;
}

let corpMap: Record<string, CorpEntry> | null = null;
let tickerToName: Map<string, string> | null = null;

async function loadCorpMap() {
  if (corpMap && tickerToName) return;
  const data = await import("@/data/corp-codes.json");
  corpMap = data.default as Record<string, CorpEntry>;
  tickerToName = new Map<string, string>();
  for (const [name, entry] of Object.entries(corpMap)) {
    tickerToName.set(entry.ticker, name);
  }
}

// GPT 결과에서 종목코드↔이름 불일치를 corp-codes.json으로 교정
function validateNodes(nodes: MindMapNode[]): MindMapNode[] {
  if (!tickerToName) return nodes;
  return nodes.map((node) => {
    if (node.type !== "company" || !node.ticker) return node;
    const correctName = tickerToName!.get(node.ticker);
    if (correctName && correctName !== node.label) {
      return { ...node, label: correctName };
    }
    return node;
  });
}

const SYSTEM_PROMPT = `당신은 한국 주식 시장의 밸류체인 탐색 전문가입니다. 사용자가 제시한 테마를 기반으로 "왜?"라는 질문을 꼬리에 꼬리를 물며 따라가면서 관련 산업과 종목을 연쇄적으로 발굴하세요.

탐색 방식 (예시: AI 테마):
- AI가 뜨면 → 연산이 필요하겠네? → 반도체 → 삼성전자, SK하이닉스
- 반도체 말고 또? → 데이터 저장도 필요 → 메모리/NAND → 관련 기업은?
- 연산하면 열 나겠네? → 냉각/방열 → 이 분야 기업은?
- 데이터 많으면? → 데이터센터 → 누가 운영? → 누가 건설?
- 데이터센터는 전기 많이 쓰겠네? → 전력/에너지 → 발전사? 변압기?
- 그리고 이 기업들의 부품은 어디서? → 하청/납품 업체는?

이렇게 "왜 필요한지"를 따라가며 자연스럽게 확장합니다.

반드시 JSON으로만 응답하세요:
{
  "nodes": [
    {"id": "고유ID", "label": "표시명", "type": "theme|industry|company", "role": "upstream|core|downstream|theme", "ticker": "6자리코드(company만)", "description": "왜 이게 필요한지 한줄 (예: AI 연산에 GPU가 필요하므로)"}
  ],
  "edges": [
    {"from": "출발노드ID", "to": "도착노드ID", "label": "왜 연결되는지 (예: 연산 처리에 반도체 필요, HBM 메모리 납품)", "flowType": "supply|product|service|demand"}
  ]
}

규칙:
1. 중심 테마 노드 1개 (type: "theme", role: "theme")
2. "왜?"를 따라가며 산업 노드를 연쇄적으로 연결. 최소 5-8개 산업 분기
3. 각 산업에서 실제 한국 상장 종목 2-4개씩 연결
4. 종목 간에도 납품/공급 관계가 있으면 직접 연결 (예: SK하이닉스→삼성전자 HBM 공급)
5. role 분류: 원재료/부품/장비 쪽은 upstream, 핵심 제품/서비스는 core, 최종 수요/고객은 downstream
6. edge 방향 = 공급→수요 흐름. label에 "왜 연결되는지" 구체적으로
7. 반드시 실존 한국 상장 종목 (종목코드 6자리 필수), 코스피+코스닥 혼합
8. 대형주만 금지. 숨겨진 중소형 부품사/장비사/소재사 반드시 포함
9. 해당 테마와 실제 사업이 무관한 종목은 절대 포함 금지. 확실하지 않으면 넣지 마세요.
10. 총 노드 25-40개, edge 25-50개`;

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

    await loadCorpMap();
    const rawNodes: MindMapNode[] = Array.isArray(parsed.nodes) ? parsed.nodes : [];
    const result: MindMapResponse = {
      nodes: validateNodes(rawNodes),
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    };

    cache.set(theme, { data: result, timestamp: now });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ nodes: [], edges: [], error: "마인드맵 생성 실패" });
  }
}
