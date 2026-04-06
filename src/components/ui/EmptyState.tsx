import { Card } from "./Card";

interface EmptyStateProps {
  title: string;
  description?: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <Card className="text-center py-12">
      <p className="text-dark-text-primary font-medium">{title}</p>
      {description && (
        <p className="text-dark-text-muted text-sm mt-1">{description}</p>
      )}
    </Card>
  );
}
