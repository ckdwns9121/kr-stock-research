"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";

interface Peer {
  ticker: string;
  name: string;
  price: number;
  changePercent: number;
  per?: number | null;
  pbr?: number | null;
}

interface PeerComparisonProps {
  ticker: string;
}

function formatNumber(n: number): string {
  return n.toLocaleString("ko-KR");
}

function formatRatio(n?: number | null): string {
  if (n == null || isNaN(n)) return "-";
  return n.toFixed(2);
}

export function PeerComparison({ ticker }: PeerComparisonProps) {
  const [sectorName, setSectorName] = useState<string | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/stock/${ticker}/peers`)
      .then((r) => r.json())
      .then((data) => {
        setSectorName(data.sectorName ?? null);
        setPeers(data.peers ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>동종업계 비교</CardTitle>
        </CardHeader>
        <div className="flex items-center gap-2 py-6 justify-center">
          <div className="w-2 h-2 bg-dark-text-muted rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 bg-dark-text-muted rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 bg-dark-text-muted rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
          <span className="text-xs text-dark-text-muted ml-2">동종업계 검색 중...</span>
        </div>
      </Card>
    );
  }

  if (peers.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>동종업계 비교</CardTitle>
        {sectorName && <p className="text-sm text-dark-text-muted mt-0.5">{sectorName}</p>}
      </CardHeader>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-border">
              <th className="text-left text-dark-text-muted font-medium pb-2 pr-3">종목명</th>
              <th className="text-right text-dark-text-muted font-medium pb-2 px-3">현재가</th>
              <th className="text-right text-dark-text-muted font-medium pb-2 px-3">등락률</th>
              <th className="text-right text-dark-text-muted font-medium pb-2 px-3">PER</th>
              <th className="text-right text-dark-text-muted font-medium pb-2 pl-3">PBR</th>
            </tr>
          </thead>
          <tbody>
            {peers.map((peer) => {
              const isCurrent = peer.ticker === ticker;
              const isPositive = peer.changePercent > 0;
              const isNegative = peer.changePercent < 0;

              return (
                <tr
                  key={peer.ticker}
                  className={`border-b border-dark-border/40 last:border-0 ${
                    isCurrent ? "border-l-2 border-l-toss-blue" : ""
                  }`}
                >
                  <td className={`py-2.5 pr-3 ${isCurrent ? "pl-2" : ""}`}>
                    <Link
                      href={`/stock/${peer.ticker}`}
                      className={`font-medium hover:underline ${
                        isCurrent
                          ? "text-toss-blue"
                          : "text-dark-text-primary hover:text-dark-text-secondary"
                      }`}
                    >
                      {peer.name}
                    </Link>
                  </td>
                  <td className="text-right text-dark-text-primary py-2.5 px-3 tabular-nums">
                    {formatNumber(peer.price)}
                  </td>
                  <td
                    className={`text-right py-2.5 px-3 tabular-nums font-medium ${
                      isPositive
                        ? "text-toss-red"
                        : isNegative
                        ? "text-toss-blue"
                        : "text-dark-text-muted"
                    }`}
                  >
                    {isPositive ? "+" : ""}
                    {peer.changePercent.toFixed(2)}%
                  </td>
                  <td className="text-right text-dark-text-secondary py-2.5 px-3 tabular-nums">
                    {formatRatio(peer.per)}
                  </td>
                  <td className="text-right text-dark-text-secondary py-2.5 pl-3 tabular-nums">
                    {formatRatio(peer.pbr)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
