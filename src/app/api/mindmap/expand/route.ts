import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `당신은 한국 주식 시장의 밸류체인/공급망 전문가입니다. 사용자가 선택한 노드를 더 깊이 확장하세요.

선택된 노드가 산업이면: 하위 산업과 관련 종목을 발굴
선택된 노드가 종목(회사)이면: 그 회사의 공급망(납품업체, 하청업체, 부품사, 원재료 공급사)과 고객사를 발굴

반드시 JSON으로만 응답하세요:
{
  "nodes": [
    {"id": "고유ID", "label": "표시명", "type": "industry|company", "ticker": "6자리코드(company만)", "description": "한줄설명"}
  ],
  "edges": [
    {"from": "노드ID", "to": "노드ID", "label": "관계설명 (예: 부품 납품, 하청 제조, 고객사)"}
  ]
}

규칙:
1. 산업 노드 확장: 하위 산업 2-4개 + 관련 종목 3-6개
2. 종목 노드 확장: 공급업체 3-5개 + 고객사 2-3개 (실존 한국 상장사만)
3. 반드시 실존하는 한국 상장 종목 (종목코드 6자리 필수)
4. 대형주뿐 아니라 숨겨진 중소형 핵심 납품업체도 발굴
5. edge의 label에 관계를 구체적으로 명시 (예: "OLED 패널 납품", "반도체 후공정 장비 공급")
6. edge의 from/to에 반드시 parentId 포함
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
