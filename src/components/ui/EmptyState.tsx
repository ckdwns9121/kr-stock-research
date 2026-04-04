import { Card } from "./Card";

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="text-center py-12">
      <p className="text-toss-gray-700 font-medium">{title}</p>
      {description && (
        <p className="text-toss-gray-400 text-sm mt-1">{description}</p>
      )}
    </Card>
  );
}
