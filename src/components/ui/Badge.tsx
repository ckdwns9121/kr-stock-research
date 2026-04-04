interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "stale" | "positive" | "negative";
  className?: string;
}

const variantStyles = {
  default: "bg-toss-gray-100 text-toss-gray-600",
  stale: "bg-yellow-50 text-yellow-700",
  positive: "bg-red-50 text-toss-red",
  negative: "bg-blue-50 text-toss-blue",
};

export function Badge({ children, variant = "default", className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
