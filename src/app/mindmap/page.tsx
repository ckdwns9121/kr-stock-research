"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface MindMapNode {
  id: string;
  label: string;
  type: "theme" | "industry" | "company";
  role?: "upstream" | "core" | "downstream" | "theme";
  ticker?: string;
  description?: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface MindMapEdge {
  from: string;
  to: string;
  label?: string;
}

const PRESET_THEMES = ["AI", "전기차", "반도체", "방산", "바이오", "로봇", "원전", "2차전지"];

// role 기반 색상 (밸류체인 흐름)
const ROLE_COLORS: Record<string, string> = {
  theme: "#3182F6",
  upstream: "#F04452",   // 빨강 — 공급
  core: "#FFB300",       // 노랑 — 핵심
  downstream: "#2AC769", // 초록 — 수요
};

const NODE_COLORS: Record<string, string> = {
  theme: "#3182F6",
  industry: "#F04452",
  company: "#2AC769",
};

const NODE_RADIUS: Record<string, number> = {
  theme: 40,
  industry: 28,
  company: 20,
};

function getNodeColor(node: MindMapNode): string {
  if (node.role && ROLE_COLORS[node.role]) return ROLE_COLORS[node.role];
  return NODE_COLORS[node.type] ?? "#666";
}

function layoutNodes(
  nodes: MindMapNode[],
  edges: MindMapEdge[],
  width: number,
  height: number
): MindMapNode[] {
  const positioned = nodes.map((n, i) => {
    const angle = (i / nodes.length) * Math.PI * 2;
    const themeNode = n.type === "theme";
    const radius = themeNode ? 0 : n.type === "industry" ? 180 : 300;
    return {
      ...n,
      x: width / 2 + Math.cos(angle) * radius + (Math.random() - 0.5) * 60,
      y: height / 2 + Math.sin(angle) * radius + (Math.random() - 0.5) * 60,
      vx: 0,
      vy: 0,
    };
  });

  // Simple force simulation
  const edgeMap = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, []);
    if (!edgeMap.has(edge.to)) edgeMap.set(edge.to, []);
    edgeMap.get(edge.from)!.push(edge.to);
    edgeMap.get(edge.to)!.push(edge.from);
  }

  for (let iter = 0; iter < 100; iter++) {
    // Repulsion between all nodes
    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const dx = positioned[j].x - positioned[i].x;
        const dy = positioned[j].y - positioned[i].y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = 2000 / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        positioned[i].vx -= fx;
        positioned[i].vy -= fy;
        positioned[j].vx += fx;
        positioned[j].vy += fy;
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = positioned.find((n) => n.id === edge.from);
      const b = positioned.find((n) => n.id === edge.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const targetDist = a.type === "theme" || b.type === "theme" ? 160 : 120;
      const force = (dist - targetDist) * 0.01;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // Center gravity
    for (const node of positioned) {
      node.vx += (width / 2 - node.x) * 0.002;
      node.vy += (height / 2 - node.y) * 0.002;
    }

    // Apply velocity with damping
    for (const node of positioned) {
      node.x += node.vx * 0.3;
      node.y += node.vy * 0.3;
      node.vx *= 0.8;
      node.vy *= 0.8;
      // Bounds
      node.x = Math.max(50, Math.min(width - 50, node.x));
      node.y = Math.max(50, Math.min(height - 50, node.y));
    }
  }

  return positioned;
}

export default function MindMapPage() {
  const [theme, setTheme] = useState("");
  const [nodes, setNodes] = useState<MindMapNode[]>([]);
  const [edges, setEdges] = useState<MindMapEdge[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanding, setExpanding] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<MindMapNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<{
    themeSummary: string;
    topPicks: { name: string; ticker: string; reason: string }[];
    chainAnalysis: string;
    riskChain: string;
    investStrategy: string;
  } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 900, height: 600 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    const updateSize = () => {
      const w = Math.min(window.innerWidth - 32, 1200);
      const h = Math.max(500, window.innerHeight - 300);
      setDimensions({ width: w, height: h });
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  const generate = useCallback(async (t: string) => {
    if (!t.trim()) return;
    setLoading(true);
    setNodes([]);
    setEdges([]);
    setSelectedNode(null);
    setReport(null);

    try {
      const res = await fetch(`/api/mindmap?theme=${encodeURIComponent(t.trim())}`);
      const data = await res.json();
      if (data.nodes?.length > 0) {
        const laid = layoutNodes(data.nodes, data.edges, dimensions.width, dimensions.height);
        setNodes(laid);
        setEdges(data.edges ?? []);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [dimensions]);

  // 줌/팬 핸들러
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom((z) => Math.max(0.3, Math.min(3, z * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({
      x: panStart.current.panX + (e.clientX - panStart.current.x) / zoom,
      y: panStart.current.panY + (e.clientY - panStart.current.y) / zoom,
    });
  }, [isPanning, zoom]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  const expandNode = useCallback(async (node: MindMapNode) => {
    setExpanding(node.id);

    try {
      const existingLabels = nodes.map((n) => `${n.label}(${n.id})`).join(",");
      const res = await fetch(
        `/api/mindmap/expand?nodeId=${encodeURIComponent(node.id)}&label=${encodeURIComponent(node.label)}&theme=${encodeURIComponent(theme)}&existing=${encodeURIComponent(existingLabels)}`
      );
      const data = await res.json();
      if (data.nodes?.length > 0) {
        const existingIds = new Set(nodes.map((n) => n.id));
        const newNodes = data.nodes.filter((n: MindMapNode) => !existingIds.has(n.id));
        const existingEdgeKeys = new Set(edges.map((e) => `${e.from}-${e.to}`));
        const newEdges = data.edges.filter((e: MindMapEdge) => !existingEdgeKeys.has(`${e.from}-${e.to}`));

        const allNodes = [...nodes, ...newNodes];
        const allEdges = [...edges, ...newEdges];
        const laid = layoutNodes(allNodes, allEdges, dimensions.width, dimensions.height);
        setNodes(laid);
        setEdges(allEdges);
      }
    } catch { /* ignore */ }
    setExpanding(null);
  }, [nodes, edges, theme, dimensions]);

  const analyzeChain = useCallback(async () => {
    if (nodes.length === 0) return;
    setAnalyzing(true);
    setReport(null);
    try {
      const res = await fetch("/api/mindmap/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes, edges, theme }),
      });
      const data = await res.json();
      setReport(data.report ?? null);
    } catch { /* ignore */ }
    setAnalyzing(false);
  }, [nodes, edges, theme]);

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

      {/* 테마 입력 */}
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

      {/* 프리셋 테마 */}
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

      {/* 범례 */}
      {nodes.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-dark-text-muted">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#3182F6]" /> 테마</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#F04452]" /> Upstream (공급)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#FFB300]" /> Core (핵심)</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#2AC769]" /> Downstream (수요)</span>
          <span className="ml-auto">노드 클릭 → 확장 | 스크롤 → 확대/축소 | 드래그 → 이동</span>
        </div>
      )}

      {/* 로딩 */}
      {loading && (
        <Card>
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="flex gap-1">
              <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-2 h-2 bg-toss-blue rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <p className="text-sm text-dark-text-secondary">"{theme}" 밸류체인 분석 중...</p>
          </div>
        </Card>
      )}

      {/* 마인드맵 SVG */}
      {nodes.length > 0 && (
        <div className="bg-dark-card rounded-xl border border-dark-border overflow-hidden relative">
          {/* 줌 컨트롤 */}
          <div className="absolute top-3 right-3 z-10 flex gap-1">
            <button onClick={() => setZoom((z) => Math.min(3, z * 1.2))} className="w-8 h-8 bg-dark-elevated rounded-lg text-dark-text-secondary hover:text-dark-text-primary text-sm font-bold">+</button>
            <button onClick={() => setZoom((z) => Math.max(0.3, z * 0.8))} className="w-8 h-8 bg-dark-elevated rounded-lg text-dark-text-secondary hover:text-dark-text-primary text-sm font-bold">−</button>
            <button onClick={resetView} className="px-2 h-8 bg-dark-elevated rounded-lg text-dark-text-secondary hover:text-dark-text-primary text-xs">리셋</button>
          </div>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="w-full select-none"
            style={{ minHeight: 500, cursor: isPanning ? "grabbing" : "grab" }}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
          <defs>
            <marker id="arrow" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 3 L 0 6 z" fill="rgba(255,255,255,0.3)" />
            </marker>
            <marker id="arrow-hover" viewBox="0 0 10 6" refX="10" refY="3" markerWidth="8" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 3 L 0 6 z" fill="#3182F6" />
            </marker>
          </defs>
          <g transform={`translate(${dimensions.width / 2}, ${dimensions.height / 2}) scale(${zoom}) translate(${-dimensions.width / 2 + pan.x}, ${-dimensions.height / 2 + pan.y})`}>
            {/* Edges */}
            {edges.map((edge, i) => {
              const from = nodes.find((n) => n.id === edge.from);
              const to = nodes.find((n) => n.id === edge.to);
              if (!from || !to) return null;
              const isHovered = hoveredNode === edge.from || hoveredNode === edge.to;
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isHovered ? "#3182F6" : "rgba(255,255,255,0.15)"}
                    strokeWidth={isHovered ? 2 : 1}
                    markerEnd={isHovered ? "url(#arrow-hover)" : "url(#arrow)"}
                  />
                  {edge.label && isHovered && (
                    <text x={mx} y={my - 6} textAnchor="middle" fill="#8B8B95" fontSize="9" fontFamily="Pretendard, sans-serif">
                      {edge.label}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Nodes */}
            {nodes.map((node) => {
              const r = NODE_RADIUS[node.type] ?? 20;
              const color = getNodeColor(node);
              const isHovered = hoveredNode === node.id;
              const isExpanding = expanding === node.id;

              return (
                <g
                  key={node.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNode(node.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node.type === "company" ? node : null);
                    expandNode(node);
                  }}
                >
                  <circle
                    cx={node.x} cy={node.y} r={r}
                    fill={color}
                    opacity={isHovered ? 1 : 0.85}
                    stroke={isHovered ? "white" : "none"}
                    strokeWidth={2}
                  />
                  {isExpanding && (
                    <circle
                      cx={node.x} cy={node.y} r={r + 4}
                      fill="none" stroke={color} strokeWidth={2}
                      opacity={0.5}
                      className="animate-ping"
                    />
                  )}
                  <text
                    x={node.x} y={node.y}
                    textAnchor="middle" dominantBaseline="central"
                    fill="white" fontWeight="700"
                    fontSize={node.type === "theme" ? 13 : node.type === "industry" ? 10 : 8}
                    fontFamily="Pretendard, sans-serif"
                  >
                    {node.label.length > 6 ? node.label.slice(0, 6) + ".." : node.label}
                  </text>
                  {node.ticker && (
                    <text
                      x={node.x} y={node.y + r + 12}
                      textAnchor="middle" fill="#8B8B95" fontSize="8"
                      fontFamily="Pretendard, sans-serif"
                    >
                      {node.ticker}
                    </text>
                  )}
                  {/* Hover tooltip */}
                  {isHovered && node.description && (
                    <>
                      <rect
                        x={node.x - 80} y={node.y - r - 30}
                        width={160} height={22} rx={6}
                        fill="#1E1E24" stroke="rgba(255,255,255,0.1)"
                      />
                      <text
                        x={node.x} y={node.y - r - 16}
                        textAnchor="middle" fill="#F0F0F5" fontSize="9"
                        fontFamily="Pretendard, sans-serif"
                      >
                        {node.description.length > 25 ? node.description.slice(0, 25) + "..." : node.description}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </g>
          </svg>
        </div>
      )}

      {/* 선택된 종목 상세 */}
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

      {/* 분석 버튼 + 리포트 */}
      {nodes.length > 0 && (
        <>
          <button
            onClick={analyzeChain}
            disabled={analyzing}
            className="w-full py-3 bg-toss-blue hover:bg-toss-blue-dark disabled:bg-dark-elevated disabled:text-dark-text-muted text-white font-semibold rounded-xl transition-colors"
          >
            {analyzing ? "실시간 데이터 수집 + AI 분석 중..." : "🔍 AI 밸류체인 분석 리포트 생성"}
          </button>

          {/* 우측 슬라이드 패널 */}
          {(analyzing || report) && (
            <div className="fixed inset-0 z-50 flex justify-end" onClick={() => { if (!analyzing) setReport(null); }}>
              <div className="absolute inset-0 bg-black/40" />
              <div
                className="relative w-full sm:w-[480px] h-full bg-dark-card border-l border-dark-border overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 헤더 */}
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

      {/* 통계 */}
      {nodes.length > 0 && (
        <div className="flex gap-4 text-xs text-dark-text-muted">
          <span>산업 {nodes.filter((n) => n.type === "industry").length}개</span>
          <span>종목 {nodes.filter((n) => n.type === "company").length}개</span>
          <span>연결 {edges.length}개</span>
        </div>
      )}
    </div>
  );
}
