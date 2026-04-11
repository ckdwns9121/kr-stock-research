"use client";

import { useState, useCallback, useMemo } from "react";
import Link from "next/link";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeTypes,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Card } from "@/components/ui/Card";

interface APINode {
  id: string;
  label: string;
  type: "theme" | "industry" | "company";
  role?: "upstream" | "core" | "downstream" | "theme";
  ticker?: string;
  description?: string;
}

interface APIEdge {
  from: string;
  to: string;
  label?: string;
}

const PRESET_THEMES = ["AI", "전기차", "반도체", "방산", "바이오", "로봇", "원전", "2차전지"];

const ROLE_COLORS: Record<string, string> = {
  theme: "#3182F6",
  upstream: "#F04452",
  core: "#FFB300",
  downstream: "#2AC769",
};

const TYPE_COLORS: Record<string, string> = {
  theme: "#3182F6",
  industry: "#F04452",
  company: "#2AC769",
};

function getColor(role?: string, type?: string): string {
  if (role && ROLE_COLORS[role]) return ROLE_COLORS[role];
  if (type && TYPE_COLORS[type]) return TYPE_COLORS[type];
  return "#666";
}

// 커스텀 노드 컴포넌트
function ThemeNode({ data }: { data: Record<string, unknown> }) {
  const color = getColor(data.role as string, "theme");
  return (
    <div
      className="flex items-center justify-center rounded-full text-white font-bold text-sm shadow-lg"
      style={{ background: color, width: 90, height: 90 }}
    >
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <span className="text-center px-1 leading-tight">{String(data.label ?? "")}</span>
    </div>
  );
}

function IndustryNode({ data }: { data: Record<string, unknown> }) {
  const color = getColor(data.role as string, "industry");
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl text-white shadow-md border border-white/10"
      style={{ background: color, width: 120, height: 50, fontSize: 11 }}
    >
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <span className="font-bold truncate max-w-[110px] text-center">{String(data.label ?? "")}</span>
      {data.description ? (
        <span className="text-[8px] text-white/70 truncate max-w-[110px]">{String(data.description)}</span>
      ) : null}
    </div>
  );
}

function CompanyNode({ data }: { data: Record<string, unknown> }) {
  const color = getColor(data.role as string, "company");
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl text-white shadow-md border border-white/10 cursor-pointer hover:scale-105 transition-transform"
      style={{ background: color, width: 100, height: 44, fontSize: 10 }}
    >
      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      <Handle type="target" position={Position.Top} className="opacity-0" />
      <span className="font-bold truncate max-w-[90px]">{String(data.label ?? "")}</span>
      {data.ticker ? (
        <span className="text-[8px] text-white/60">{String(data.ticker)}</span>
      ) : null}
    </div>
  );
}

const nodeTypes: NodeTypes = {
  theme: ThemeNode,
  industry: IndustryNode,
  company: CompanyNode,
};

// API 노드 → React Flow 노드 변환 + 레이아웃
function toFlowNodes(apiNodes: APINode[]): Node[] {
  const themeIdx = apiNodes.findIndex((n) => n.type === "theme");
  const cx = 500, cy = 300;

  return apiNodes.map((n, i) => {
    let x: number, y: number;
    if (n.type === "theme") {
      x = cx; y = cy;
    } else {
      const nonThemeIdx = i > themeIdx ? i - 1 : i;
      const total = apiNodes.length - 1;
      const angle = (nonThemeIdx / total) * Math.PI * 2 - Math.PI / 2;
      const radius = n.type === "industry" ? 250 : 420;
      x = cx + Math.cos(angle) * radius + (Math.random() - 0.5) * 40;
      y = cy + Math.sin(angle) * radius + (Math.random() - 0.5) * 40;
    }

    return {
      id: n.id,
      type: n.type,
      position: { x, y },
      data: {
        label: n.label,
        role: n.role,
        ticker: n.ticker,
        description: n.description,
        nodeType: n.type,
      },
    };
  });
}

function toFlowEdges(apiEdges: APIEdge[]): Edge[] {
  return apiEdges.map((e, i) => ({
    id: `e-${i}-${e.from}-${e.to}`,
    source: e.from,
    target: e.to,
    label: e.label,
    animated: false,
    style: { stroke: "rgba(255,255,255,0.2)", strokeWidth: 1.5 },
    labelStyle: { fill: "#8B8B95", fontSize: 9, fontFamily: "Pretendard, sans-serif" },
    labelBgStyle: { fill: "#1E1E24", opacity: 0.9 },
    labelBgPadding: [4, 2] as [number, number],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.3)", width: 16, height: 12 },
  }));
}

export default function MindMapPage() {
  const [theme, setTheme] = useState("");
  const [flowNodes, setFlowNodes, onNodesChange] = useNodesState<Node>([]);
  const [flowEdges, setFlowEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [rawNodes, setRawNodes] = useState<APINode[]>([]);
  const [rawEdges, setRawEdges] = useState<APIEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanding, setExpanding] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<APINode | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<{
    themeSummary: string;
    topPicks: { name: string; ticker: string; reason: string }[];
    chainAnalysis: string;
    riskChain: string;
    investStrategy: string;
  } | null>(null);

  const generate = useCallback(async (t: string) => {
    if (!t.trim()) return;
    setLoading(true);
    setFlowNodes([]);
    setFlowEdges([]);
    setRawNodes([]);
    setRawEdges([]);
    setSelectedNode(null);
    setReport(null);

    try {
      const res = await fetch(`/api/mindmap?theme=${encodeURIComponent(t.trim())}`);
      const data = await res.json();
      if (data.nodes?.length > 0) {
        setRawNodes(data.nodes);
        setRawEdges(data.edges ?? []);
        setFlowNodes(toFlowNodes(data.nodes));
        setFlowEdges(toFlowEdges(data.edges ?? []));
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [setFlowNodes, setFlowEdges]);

  const expandNode = useCallback(async (apiNode: APINode) => {
    setExpanding(apiNode.id);
    try {
      const existingLabels = rawNodes.map((n) => `${n.label}(${n.id})`).join(",");
      const res = await fetch(
        `/api/mindmap/expand?nodeId=${encodeURIComponent(apiNode.id)}&label=${encodeURIComponent(apiNode.label)}&theme=${encodeURIComponent(theme)}&existing=${encodeURIComponent(existingLabels)}`
      );
      const data = await res.json();
      if (data.nodes?.length > 0) {
        const existingIds = new Set(rawNodes.map((n) => n.id));
        const newApiNodes: APINode[] = data.nodes.filter((n: APINode) => !existingIds.has(n.id));
        const existingEdgeKeys = new Set(rawEdges.map((e) => `${e.from}-${e.to}`));
        const newApiEdges: APIEdge[] = (data.edges ?? []).filter((e: APIEdge) => !existingEdgeKeys.has(`${e.from}-${e.to}`));

        const allApiNodes = [...rawNodes, ...newApiNodes];
        const allApiEdges = [...rawEdges, ...newApiEdges];
        setRawNodes(allApiNodes);
        setRawEdges(allApiEdges);
        setFlowNodes(toFlowNodes(allApiNodes));
        setFlowEdges(toFlowEdges(allApiEdges));
      }
    } catch { /* ignore */ }
    setExpanding(null);
  }, [rawNodes, rawEdges, theme, setFlowNodes, setFlowEdges]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    const apiNode = rawNodes.find((n) => n.id === node.id);
    if (!apiNode) return;
    if (apiNode.type === "company") setSelectedNode(apiNode);
    expandNode(apiNode);
  }, [rawNodes, expandNode]);

  const analyzeChain = useCallback(async () => {
    if (rawNodes.length === 0) return;
    setAnalyzing(true);
    setReport(null);
    try {
      const res = await fetch("/api/mindmap/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes: rawNodes, edges: rawEdges, theme }),
      });
      const data = await res.json();
      setReport(data.report ?? null);
    } catch { /* ignore */ }
    setAnalyzing(false);
  }, [rawNodes, rawEdges, theme]);

  const miniMapNodeColor = useCallback((node: Node) => {
    return getColor(node.data?.role as string, node.type);
  }, []);

  const hasNodes = flowNodes.length > 0;

  return (
    <div className="space-y-4">
      <section>
        <h1 className="text-2xl font-bold text-dark-text-primary">밸류체인 마인드맵</h1>
        <p className="text-sm text-dark-text-secondary mt-1">
          테마를 입력하면 AI가 밸류체인을 따라 관련 산업과 종목을 자동 발굴합니다
        </p>
        <div className="mt-3 bg-dark-elevated rounded-xl p-3 text-xs text-dark-text-muted leading-relaxed">
          <span className="text-dark-text-secondary font-semibold">밸류체인(Value Chain)이란?</span> 하나의 테마가 실현되기 위해 필요한 산업들의 연결 고리입니다. 예: AI → 반도체(연산) → 메모리(저장) → 데이터센터(인프라) → 전력(에너지). 한 단계가 성장하면 앞뒤 단계도 같이 수혜를 받기 때문에, 이 연결을 따라가면 숨겨진 투자 기회를 찾을 수 있습니다.
        </div>
      </section>

      <div className="flex gap-2">
        <input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && generate(theme)}
          placeholder="테마 키워드 입력 (예: AI, 전기차, 방산)"
          className="flex-1 px-4 py-2.5 bg-dark-elevated border border-dark-border rounded-xl text-sm text-dark-text-primary placeholder:text-dark-text-muted focus:outline-none focus:ring-2 focus:ring-toss-blue/30 focus:border-toss-blue"
        />
        <button
          onClick={() => generate(theme)}
          disabled={loading || !theme.trim()}
          className="px-6 py-2.5 bg-toss-blue hover:bg-toss-blue-dark disabled:bg-dark-elevated disabled:text-dark-text-muted text-white font-semibold rounded-xl transition-colors"
        >
          {loading ? "생성 중..." : "발굴"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESET_THEMES.map((t) => (
          <button
            key={t}
            onClick={() => { setTheme(t); generate(t); }}
            className="px-3 py-1.5 bg-dark-elevated text-dark-text-secondary text-xs font-medium rounded-lg hover:text-dark-text-primary hover:bg-dark-card transition-colors"
          >
            {t}
          </button>
        ))}
      </div>

      {hasNodes && (
        <div className="flex items-center gap-4 text-xs text-dark-text-muted">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#3182F6]" /> 테마</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#F04452]" /> Upstream (공급)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#FFB300]" /> Core (핵심)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#2AC769]" /> Downstream (수요)</span>
          <span className="ml-auto">노드 클릭 → 확장 | 드래그 → 이동 | 스크롤 → 확대</span>
        </div>
      )}

      {loading && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-sm text-dark-text-secondary">&quot;{theme}&quot; 밸류체인 분석 중...</p>
          </div>
        </Card>
      )}

      {/* React Flow 마인드맵 */}
      {hasNodes && (
        <div className="rounded-xl border border-dark-border overflow-hidden" style={{ height: 600 }}>
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={3}
            proOptions={{ hideAttribution: true }}
            style={{ background: "#17171C" }}
          >
            <Background color="rgba(255,255,255,0.03)" gap={20} />
            <Controls
              showInteractive={false}
              style={{ background: "#26262C", borderColor: "rgba(255,255,255,0.06)" }}
            />
            <MiniMap
              nodeColor={miniMapNodeColor}
              maskColor="rgba(0,0,0,0.7)"
              style={{ background: "#1E1E24", borderColor: "rgba(255,255,255,0.06)" }}
            />
          </ReactFlow>
        </div>
      )}

      {/* 선택된 종목 */}
      {selectedNode && selectedNode.type === "company" && selectedNode.ticker && (
        <Card className="border border-toss-green/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-lg font-bold text-dark-text-primary">{selectedNode.label}</p>
              <p className="text-xs text-dark-text-muted">{selectedNode.ticker} · {selectedNode.description}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/stock/${selectedNode.ticker}`}
                className="px-4 py-2 bg-toss-blue hover:bg-toss-blue-dark text-white text-sm font-semibold rounded-lg transition-colors"
              >
                종목 상세 →
              </Link>
              <button
                onClick={() => setSelectedNode(null)}
                className="px-3 py-2 bg-dark-elevated text-dark-text-secondary text-sm rounded-lg hover:text-dark-text-primary"
              >
                닫기
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* 분석 버튼 + 슬라이드 패널 */}
      {hasNodes && (
        <>
          <button
            onClick={analyzeChain}
            disabled={analyzing}
            className="w-full py-3 bg-toss-blue hover:bg-toss-blue-dark disabled:bg-dark-elevated disabled:text-dark-text-muted text-white font-semibold rounded-xl transition-colors"
          >
            {analyzing ? "실시간 데이터 수집 + AI 분석 중..." : "🔍 AI 밸류체인 분석 리포트 생성"}
          </button>

          {(analyzing || report) && (
            <div className="fixed inset-0 z-50 flex justify-end" onClick={() => { if (!analyzing) setReport(null); }}>
              <div className="absolute inset-0 bg-black/40" />
              <div
                className="relative w-full sm:w-[480px] h-full bg-dark-card border-l border-dark-border overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="sticky top-0 bg-dark-card border-b border-dark-border px-5 py-4 flex items-center justify-between z-10">
                  <h2 className="text-base font-bold text-dark-text-primary">📊 AI 밸류체인 분석</h2>
                  {!analyzing && (
                    <button onClick={() => setReport(null)} className="text-dark-text-muted hover:text-dark-text-primary p-1">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                    </button>
                  )}
                </div>

                <div className="p-5 space-y-4">
                  {analyzing && (
                    <div className="flex flex-col items-center gap-3 py-12">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                      <p className="text-sm text-dark-text-secondary">종목별 실시간 시세 + 뉴스 수집 중...</p>
                    </div>
                  )}

                  {report && (
                    <>
                      <div className="bg-dark-elevated rounded-xl p-4 border border-toss-blue/20">
                        <p className="text-xs font-semibold text-toss-blue mb-2">📌 테마 요약</p>
                        <p className="text-sm text-dark-text-primary leading-relaxed">{report.themeSummary}</p>
                      </div>
                      <div className="bg-dark-elevated rounded-xl p-4 border border-toss-red/20">
                        <p className="text-xs font-semibold text-toss-red mb-3">🏆 핵심 수혜주 TOP {report.topPicks.length}</p>
                        <div className="space-y-3">
                          {report.topPicks.map((pick, i) => (
                            <div key={pick.ticker} className="flex items-start gap-3">
                              <span className="flex-shrink-0 w-6 h-6 bg-toss-red/15 text-toss-red rounded-full flex items-center justify-center text-xs font-bold">{i + 1}</span>
                              <div>
                                <Link href={`/stock/${pick.ticker}`} className="text-sm font-semibold text-dark-text-primary hover:text-toss-blue">
                                  {pick.name} <span className="text-dark-text-muted font-normal">({pick.ticker})</span>
                                </Link>
                                <p className="text-xs text-dark-text-secondary mt-0.5 leading-relaxed">{pick.reason}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="bg-dark-elevated rounded-xl p-4 border border-toss-green/20">
                        <p className="text-xs font-semibold text-toss-green mb-2">🔗 꼬리에 꼬리를 무는 분석</p>
                        <p className="text-sm text-dark-text-primary leading-relaxed whitespace-pre-line">{report.chainAnalysis}</p>
                      </div>
                      <div className="bg-dark-elevated rounded-xl p-4 border border-yellow-500/20">
                        <p className="text-xs font-semibold text-yellow-400 mb-2">⚠️ 리스크 체인</p>
                        <p className="text-sm text-dark-text-primary leading-relaxed">{report.riskChain}</p>
                      </div>
                      <div className="bg-dark-elevated rounded-xl p-4 border border-dark-border">
                        <p className="text-xs font-semibold text-dark-text-primary mb-2">💡 투자 전략</p>
                        <p className="text-sm text-dark-text-primary leading-relaxed">{report.investStrategy}</p>
                      </div>
                      <p className="text-[11px] text-dark-text-muted text-center pb-4">
                        ⚠️ 실시간 시세 + 뉴스 기반 AI 분석 · 투자 판단의 책임은 본인에게 있습니다
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {hasNodes && (
        <div className="flex gap-4 text-xs text-dark-text-muted">
          <span>산업 {rawNodes.filter((n) => n.type === "industry").length}개</span>
          <span>종목 {rawNodes.filter((n) => n.type === "company").length}개</span>
          <span>연결 {rawEdges.length}개</span>
        </div>
      )}
    </div>
  );
}
