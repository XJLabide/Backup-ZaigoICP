import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';

interface EmptyStateProps {
  icon: string; // emoji like "📬" or "✅"
  title: string;
  description: string;
  action?: {
    label: string;
    href: string;
  };
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="text-6xl mb-4">{icon}</div>
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-600 text-center max-w-md">{description}</p>
        {action && (
          <Link href={action.href} className="mt-6">
            <button className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
              {action.label}
            </button>
          </Link>
        )}
      </CardContent>
    </Card>
  );
}
