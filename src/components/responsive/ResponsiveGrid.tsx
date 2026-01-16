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
  gap?: number | {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  className?: string;
}

/**
 * Responsive grid component that adapts columns based on screen size
 *
 * Mobile-first approach with configurable columns for each breakpoint
 *
 * @example
 * ```tsx
 * // Simple: 1 column on mobile, 2 on tablet, 4 on desktop
 * <ResponsiveGrid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }} gap={4}>
 *   <Card />
 *   <Card />
 *   <Card />
 * </ResponsiveGrid>
 *
 * // With responsive gap
 * <ResponsiveGrid
 *   cols={{ xs: 1, md: 2, lg: 3 }}
 *   gap={{ xs: 2, md: 4, lg: 6 }}
 * >
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
  // Handle responsive gap
  const gapClasses = typeof gap === 'number'
    ? `gap-${gap}`
    : cn(
        gap.xs && `gap-${gap.xs}`,
        gap.sm && `sm:gap-${gap.sm}`,
        gap.md && `md:gap-${gap.md}`,
        gap.lg && `lg:gap-${gap.lg}`
      );

  // Build grid column classes
  const gridCols = cn(
    cols.xs && `grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    cols['2xl'] && `2xl:grid-cols-${cols['2xl']}`
  );

  return (
    <div className={cn('grid', gridCols, gapClasses, className)}>
      {children}
    </div>
  );
}

/**
 * Responsive container that centers content with responsive padding
 */
export interface ResponsiveContainerProps {
  children: React.ReactNode;
  size?: 'mobile' | 'tablet' | 'desktop' | 'full';
  className?: string;
}

export function ResponsiveContainer({
  children,
  size = 'desktop',
  className,
}: ResponsiveContainerProps) {
  const maxWidthClass = {
    mobile: 'max-w-mobile',
    tablet: 'max-w-tablet',
    desktop: 'max-w-desktop',
    full: 'max-w-full',
  }[size];

  return (
    <div className={cn('container mx-auto', maxWidthClass, className)}>
      {children}
    </div>
  );
}

/**
 * Responsive stack component - vertical spacing that adapts to screen size
 */
export interface ResponsiveStackProps {
  children: React.ReactNode;
  space?: number | {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  className?: string;
}

export function ResponsiveStack({
  children,
  space = 4,
  className,
}: ResponsiveStackProps) {
  const spaceClasses = typeof space === 'number'
    ? `space-y-${space}`
    : cn(
        space.xs && `space-y-${space.xs}`,
        space.sm && `sm:space-y-${space.sm}`,
        space.md && `md:space-y-${space.md}`,
        space.lg && `lg:space-y-${space.lg}`
      );

  return (
    <div className={cn('flex flex-col', spaceClasses, className)}>
      {children}
    </div>
  );
}

/**
 * Responsive columns - side-by-side on desktop, stacked on mobile
 */
export interface ResponsiveColumnsProps {
  children: React.ReactNode;
  breakpoint?: 'sm' | 'md' | 'lg';
  gap?: number;
  className?: string;
}

export function ResponsiveColumns({
  children,
  breakpoint = 'md',
  gap = 4,
  className,
}: ResponsiveColumnsProps) {
  const breakpointClass = {
    sm: 'sm:flex-row',
    md: 'md:flex-row',
    lg: 'lg:flex-row',
  }[breakpoint];

  return (
    <div
      className={cn(
        'flex flex-col',
        breakpointClass,
        `gap-${gap}`,
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * Masonry grid - Pinterest-style layout
 */
export interface ResponsiveMasonryProps {
  children: React.ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
  };
  gap?: number;
  className?: string;
}

export function ResponsiveMasonry({
  children,
  cols = { xs: 1, sm: 2, md: 3, lg: 4 },
  gap = 4,
  className,
}: ResponsiveMasonryProps) {
  const columnClasses = cn(
    cols.xs && `columns-${cols.xs}`,
    cols.sm && `sm:columns-${cols.sm}`,
    cols.md && `md:columns-${cols.md}`,
    cols.lg && `lg:columns-${cols.lg}`
  );

  return (
    <div className={cn(columnClasses, `gap-${gap}`, className)}>
      {React.Children.map(children, child => (
        <div className="break-inside-avoid mb-4">
          {child}
        </div>
      ))}
    </div>
  );
}

/**
 * Responsive section with proper spacing
 */
export interface ResponsiveSectionProps {
  children: React.ReactNode;
  spacing?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ResponsiveSection({
  children,
  spacing = 'md',
  className,
}: ResponsiveSectionProps) {
  const spacingClass = {
    sm: 'py-8 md:py-12',
    md: 'py-12 md:py-16',
    lg: 'py-16 md:py-24',
    xl: 'py-24 md:py-32',
  }[spacing];

  return (
    <section className={cn(spacingClass, className)}>
      {children}
    </section>
  );
}
