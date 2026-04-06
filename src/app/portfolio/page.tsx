import type { Metadata } from "next";
import { PortfolioClient } from "@/components/portfolio/PortfolioClient";

export const metadata: Metadata = {
  title: "가상 포트폴리오 - 주식리서치",
  description: "모의 매수로 포트폴리오를 구성하고 수익률을 추적하세요.",
};

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <section className="pt-4">
        <h1 className="text-2xl font-bold text-dark-text-primary">가상 포트폴리오</h1>
        <p className="text-sm text-dark-text-secondary mt-1">
          모의 매수로 포트폴리오를 구성하고 수익률을 추적하세요
        </p>
      </section>
      <PortfolioClient />
    </div>
  );
}
