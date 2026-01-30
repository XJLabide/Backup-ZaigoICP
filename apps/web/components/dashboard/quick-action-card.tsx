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
      <div className="bg-[#242836] border border-white/10 rounded-lg p-6 hover:bg-[#2d3242] hover:border-[#d4a84b] transition-colors cursor-pointer group">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {Icon && <Icon className="w-5 h-5 text-[#d4a84b]" />}
            <div>
              <p className="font-semibold text-white">{title}</p>
              <p className="text-sm text-[#9ca3af]">{description}</p>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-[#6b7280] group-hover:text-[#d4a84b] transition-colors" />
        </div>
      </div>
    </Link>
  );
}
