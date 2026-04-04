"use client";

import { Card } from "./Card";

interface ErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  variant?: "full" | "subtle";
}

export function ErrorCard({
  title = "데이터를 불러올 수 없습니다",
  message,
  onRetry,
  variant = "full",
}: ErrorCardProps) {
  if (variant === "subtle") {
    return (
      <div className="text-center py-6 text-toss-gray-400 text-sm">
        <p>{title}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-toss-blue text-sm font-medium hover:underline"
          >
            다시 시도
          </button>
        )}
      </div>
    );
  }

  return (
    <Card className="text-center py-8">
      <div className="text-toss-gray-400 mb-2">
        <svg className="w-10 h-10 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
        </svg>
      </div>
      <p className="text-toss-gray-700 font-medium">{title}</p>
      {message && <p className="text-toss-gray-400 text-sm mt-1">{message}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 px-4 py-2 bg-toss-blue text-white rounded-xl text-sm font-medium hover:bg-toss-blue-dark transition-colors"
        >
          다시 시도
        </button>
      )}
    </Card>
  );
}
