import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  variant?: 'default' | 'compact' | 'card';
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  variant = 'default',
}: EmptyStateProps) {
  if (variant === 'compact') {
    return (
      <div className={cn('flex flex-col items-center justify-center py-8 px-4 text-center', className)}>
        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-3">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <h3 className="text-sm font-medium text-foreground mb-1">{title}</h3>
        <p className="text-xs text-muted-foreground mb-3 max-w-xs">{description}</p>
        {action && (
          <Button size="sm" onClick={action.onClick} className="gap-1.5">
            {action.icon && <action.icon className="h-3.5 w-3.5" />}
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-muted-foreground/25 bg-muted/20',
        className
      )}>
        <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-base font-medium text-foreground mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-sm">{description}</p>
        {action && (
          <Button onClick={action.onClick} className="gap-2">
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="link" size="sm" onClick={secondaryAction.onClick} className="mt-2">
            {secondaryAction.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-16 px-6 text-center',
      className
    )}>
      <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-5">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-md">{description}</p>
      <div className="flex items-center gap-3">
        {action && (
          <Button onClick={action.onClick} className="gap-2">
            {action.icon && <action.icon className="h-4 w-4" />}
            {action.label}
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" onClick={secondaryAction.onClick}>
            {secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}
