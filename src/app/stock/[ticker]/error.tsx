"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/ui/ErrorCard";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function StockError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("[StockPage error]", error);
  }, [error]);

  return (
    <div className="py-8">
      <ErrorCard
        title="페이지를 불러올 수 없습니다"
        message="잠시 후 다시 시도해 주세요."
        onRetry={reset}
      />
    </div>
  );
}
