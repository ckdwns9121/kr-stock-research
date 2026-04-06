import type { FinancialStatement } from "@/types/financial";
import { formatLargeNumber } from "@/lib/format";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

interface FinancialTableProps {
  statements: FinancialStatement[];
}

export function FinancialTable({ statements }: FinancialTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>재무제표</CardTitle>
      </CardHeader>

      {statements.length === 0 ? (
        <EmptyState title="재무 데이터가 없습니다" />
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-dark-border">
                <th className="text-left py-2 px-1 text-xs font-medium text-dark-text-muted whitespace-nowrap">
                  연도/분기
                </th>
                <th className="text-right py-2 px-1 text-xs font-medium text-dark-text-muted whitespace-nowrap">
                  매출액
                </th>
                <th className="text-right py-2 px-1 text-xs font-medium text-dark-text-muted whitespace-nowrap">
                  영업이익
                </th>
                <th className="text-right py-2 px-1 text-xs font-medium text-dark-text-muted whitespace-nowrap">
                  순이익
                </th>
              </tr>
            </thead>
            <tbody>
              {statements.map((s, i) => (
                <tr
                  key={i}
                  className="border-b border-dark-border last:border-0 hover:bg-dark-elevated transition-colors"
                >
                  <td className="py-3 px-1 font-medium text-dark-text-primary whitespace-nowrap">
                    {s.year}
                    {s.quarter ? ` ${s.quarter}` : ""}
                  </td>
                  <td className="py-3 px-1 text-right text-dark-text-primary font-medium tabular-nums">
                    {formatLargeNumber(s.revenue)}
                  </td>
                  <td className="py-3 px-1 text-right font-medium tabular-nums">
                    <span
                      className={
                        s.operatingProfit >= 0
                          ? "text-dark-text-primary"
                          : "text-toss-blue"
                      }
                    >
                      {formatLargeNumber(s.operatingProfit)}
                    </span>
                  </td>
                  <td className="py-3 px-1 text-right font-medium tabular-nums">
                    <span
                      className={
                        s.netProfit >= 0 ? "text-dark-text-primary" : "text-toss-blue"
                      }
                    >
                      {formatLargeNumber(s.netProfit)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
