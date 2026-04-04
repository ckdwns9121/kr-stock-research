export function formatKRW(value: number): string {
  if (Math.abs(value) >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(1)}조원`;
  }
  if (Math.abs(value) >= 1_0000) {
    return `${(value / 1_0000).toFixed(0)}억원`;
  }
  return `${value.toLocaleString("ko-KR")}원`;
}

export function formatPrice(value: number): string {
  return value.toLocaleString("ko-KR");
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export function formatLargeNumber(value: number): string {
  if (Math.abs(value) >= 1_0000_0000_0000) {
    return `${(value / 1_0000_0000_0000).toFixed(1)}조`;
  }
  if (Math.abs(value) >= 1_0000_0000) {
    return `${(value / 1_0000_0000).toFixed(0)}억`;
  }
  if (Math.abs(value) >= 1_0000) {
    return `${(value / 1_0000).toFixed(0)}만`;
  }
  return value.toLocaleString("ko-KR");
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);

  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  if (diffHour < 24) return `${diffHour}시간 전`;

  return `${date.getMonth() + 1}.${date.getDate()}`;
}

export function formatRatio(value: number | undefined | null): string {
  if (value == null || isNaN(value)) return "-";
  return value.toFixed(2);
}

export function timeAgo(timestamp: number): string {
  const diffMin = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMin < 1) return "방금 전";
  if (diffMin < 60) return `${diffMin}분 전`;
  return `${Math.floor(diffMin / 60)}시간 전`;
}
