import React from 'react';
import { cn } from '@/lib/utils';

export interface ResponsiveGridProps {
  children: React.ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: number;
  className?: string;
}

/**
 * Responsive grid that adapts to screen size
 * 
 * @example
 * ```tsx
 * <ResponsiveGrid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
 *   <Card />
 *   <Card />
 *   <Card />
 * </ResponsiveGrid>
 * ```
 */
export function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  className,
}: ResponsiveGridProps) {
  const gridColsClasses = [
    cols.xs && `grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`,
  ].filter(Boolean);

  return (
    <div
      className={cn(
        'grid',
        ...gridColsClasses,
        `gap-${gap}`,
        className
      )}
    >
      {children}
    </div>
  );
}
