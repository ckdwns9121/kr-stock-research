"use client";

import { ErrorCard } from "@/components/ui/ErrorCard";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="py-12">
      <ErrorCard
        title="문제가 발생했습니다"
        message="잠시 후 다시 시도해주세요."
        onRetry={reset}
      />
    </div>
  );
}
