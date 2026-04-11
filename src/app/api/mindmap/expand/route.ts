import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `당신은 한국 주식 시장의 밸류체인 탐색 전문가입니다. 사용자가 선택한 노드를 "왜?"를 따라가며 꼬리에 꼬리를 물어 확장하세요.

선택된 노드가 산업이면:
- "이 산업이 성장하면 또 뭐가 필요하지?" → 연관 산업 발굴
- "이 산업의 핵심 플레이어는?" → 관련 종목 발굴
- "이 산업에 부품/원재료를 공급하는 곳은?" → 숨겨진 공급사 발굴

선택된 노드가 종목(회사)이면:
- "이 회사에 부품/원재료를 납품하는 곳은?" → 하청/공급 업체
- "이 회사의 제품을 사는 고객사는?" → 수요처
- "이 회사가 잘되면 같이 좋아지는 곳은?" → 수혜 기업

반드시 JSON으로만 응답하세요:
{
  "nodes": [
    {"id": "고유ID", "label": "표시명", "type": "industry|company", "role": "upstream|core|downstream", "ticker": "6자리코드(company만)", "description": "왜 연결되는지 한줄"}
  ],
  "edges": [
    {"from": "출발노드ID", "to": "도착노드ID", "label": "왜 연결되는지 구체적으로", "flowType": "supply|product|service|demand"}
  ]
}

규칙:
1. edge 방향 = 공급→수요 흐름
2. 종목 간 직접 납품/공급 관계가 있으면 반드시 직접 연결
3. 반드시 실존 한국 상장 종목 (종목코드 6자리 필수)
4. 대형주뿐 아니라 숨겨진 중소형 핵심 납품업체/부품사 발굴
5. edge의 from/to에 반드시 parentId 포함
6. 해당 회사의 실제 사업과 무관한 연결 금지. 확실하지 않으면 넣지 마세요.
7. 총 노드 8-15개`;

export async function GET(request: NextRequest) {
  const nodeId = request.nextUrl.searchParams.get("nodeId")?.trim();
  const nodeLabel = request.nextUrl.searchParams.get("label")?.trim();
  const theme = request.nextUrl.searchParams.get("theme")?.trim();
  const existing = request.nextUrl.searchParams.get("existing")?.trim() ?? "";

  if (!nodeId || !nodeLabel) {
    return NextResponse.json({ nodes: [], edges: [], error: "노드 정보가 필요합니다" });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ nodes: [], edges: [], error: "OPENAI_API_KEY 미설정" });
  }

  try {
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `테마: ${theme ?? "일반"}\n확장할 노드: "${nodeLabel}" (ID: ${nodeId})\n\n이 노드를 더 깊이 파고들어 하위 밸류체인과 관련 종목을 발굴하세요. parentId는 "${nodeId}"입니다.\n\n기존에 이미 있는 노드들: ${existing}\n이미 있는 종목/산업은 새 노드로 만들지 말고, 기존 ID를 edge의 from/to에 사용하여 연결하세요. 새 종목만 새 노드로 추가하세요.` },
      ],
      temperature: 0.5,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw);

    return NextResponse.json({
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges : [],
    });
  } catch {
    return NextResponse.json({ nodes: [], edges: [], error: "확장 실패" });
  }
}
