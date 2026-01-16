import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StorageCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  connected?: boolean;
  onClick?: () => void;
}

export function StorageCard({ icon, title, subtitle, connected, onClick }: StorageCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center p-5 rounded-lg border border-border',
        'bg-card hover:shadow-md hover:border-primary/50 transition-all duration-200',
        'min-w-[160px] h-[120px] text-center'
      )}
    >
      <div className="mb-3">{icon}</div>
      <span className="text-sm font-medium text-foreground">{title}</span>
      <span className="text-xs text-muted-foreground mt-1">
        {connected ? (
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success" />
            Connected
          </span>
        ) : (
          subtitle
        )}
      </span>
    </button>
  );
}
