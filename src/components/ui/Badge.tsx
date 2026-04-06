interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "stale" | "positive" | "negative";
  className?: string;
}

const variantStyles = {
  default: "bg-dark-elevated text-dark-text-secondary",
  stale: "bg-yellow-900/30 text-yellow-400",
  positive: "bg-toss-red/15 text-toss-red",
  negative: "bg-toss-blue/15 text-toss-blue",
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
