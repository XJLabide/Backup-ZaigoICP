import Link from 'next/link';
import { ArrowRight, LucideIcon } from 'lucide-react';

interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  icon?: LucideIcon;
}

export function QuickActionCard({ title, description, href, icon: Icon }: QuickActionCardProps) {
  return (
    <Link href={href}>
      <div className="bg-neutral-100 rounded-lg p-6 hover:bg-neutral-200 transition-colors cursor-pointer group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-neutral-600" />}
            <div>
              <p className="font-semibold text-black">{title}</p>
              <p className="text-sm text-neutral-600">{description}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-neutral-400 group-hover:text-black transition-colors" />
        </div>
      </div>
    </Link>
  );
}
