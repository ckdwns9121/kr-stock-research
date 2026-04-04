import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function getChangeColor(value: number): string {
  if (value > 0) return "text-toss-red";
  if (value < 0) return "text-toss-blue";
  return "text-toss-gray-500";
}

export function getChangeBgColor(value: number): string {
  if (value > 0) return "bg-red-50 text-toss-red";
  if (value < 0) return "bg-blue-50 text-toss-blue";
  return "bg-toss-gray-100 text-toss-gray-500";
}

export function formatDateParam(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}
