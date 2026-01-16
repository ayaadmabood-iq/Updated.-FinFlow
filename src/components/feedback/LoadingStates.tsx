import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

/**
 * Spinner component for loading states
 * Accessible with proper ARIA attributes
 *
 * @example
 * ```tsx
 * <Spinner size="md" className="text-primary" />
 * ```
 */
export interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
  const sizeClasses = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  }[size];

  return (
    <Loader2
      className={cn('animate-spin text-primary', sizeClasses, className)}
      role="status"
      aria-label={label}
      aria-live="polite"
    />
  );
}

/**
 * Full page loading overlay
 * Blocks interaction while loading critical operations
 *
 * @example
 * ```tsx
 * {isLoading && <LoadingOverlay message="Processing your request..." />}
 * ```
 */
export interface LoadingOverlayProps {
  message?: string;
  description?: string;
}

export function LoadingOverlay({ message = 'Loading...', description }: LoadingOverlayProps) {
  // Prevent body scroll when overlay is shown
  React.useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-busy="true"
      aria-labelledby="loading-title"
      aria-describedby={description ? 'loading-description' : undefined}
    >
      <div className="bg-background rounded-lg p-6 sm:p-8 flex flex-col items-center gap-4 max-w-sm w-full shadow-2xl">
        <Spinner size="lg" label={message} />
        <div className="text-center">
          <p id="loading-title" className="text-foreground font-semibold text-lg">
            {message}
          </p>
          {description && (
            <p id="loading-description" className="text-muted-foreground text-sm mt-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for content placeholders
 * Use while actual content is loading
 *
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-full" />
 * <Skeleton className="h-20 w-3/4" />
 * ```
 */
export interface SkeletonProps {
  className?: string;
  variant?: 'default' | 'text' | 'circular';
}

export function Skeleton({ className, variant = 'default' }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-muted',
        variant === 'default' && 'rounded-md',
        variant === 'text' && 'rounded h-4',
        variant === 'circular' && 'rounded-full',
        className
      )}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Card skeleton loader
 * Pre-built skeleton for card layouts
 */
export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3 bg-card" role="status" aria-busy="true">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-9 w-20" />
        <Skeleton className="h-9 w-20" />
      </div>
      <span className="sr-only">Loading card...</span>
    </div>
  );
}

/**
 * Table skeleton loader
 * Pre-built skeleton for table layouts
 */
export interface TableSkeletonProps {
  rows?: number;
  columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      {/* Header */}
      <div className="flex gap-4 pb-3 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-3">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}

      <span className="sr-only">Loading table data...</span>
    </div>
  );
}

/**
 * List skeleton loader
 * Pre-built skeleton for list layouts
 */
export interface ListSkeletonProps {
  items?: number;
}

export function ListSkeleton({ items = 5 }: ListSkeletonProps) {
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3 border rounded-lg">
          <Skeleton variant="circular" className="h-10 w-10 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
      <span className="sr-only">Loading list items...</span>
    </div>
  );
}

/**
 * Inline loading indicator
 * Small loader for inline use (e.g., in buttons)
 *
 * @example
 * ```tsx
 * <button disabled>
 *   <InlineLoading message="Saving..." />
 * </button>
 * ```
 */
export interface InlineLoadingProps {
  message: string;
  size?: 'sm' | 'md';
}

export function InlineLoading({ message, size = 'sm' }: InlineLoadingProps) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground" role="status" aria-live="polite">
      <Spinner size={size === 'sm' ? 'xs' : 'sm'} className="text-current" />
      <span className="text-sm">{message}</span>
    </div>
  );
}

/**
 * Loading button state
 * Button with integrated loading spinner
 *
 * @example
 * ```tsx
 * <button disabled={isLoading}>
 *   {isLoading ? <LoadingButton label="Saving..." /> : 'Save'}
 * </button>
 * ```
 */
export interface LoadingButtonProps {
  label: string;
}

export function LoadingButton({ label }: LoadingButtonProps) {
  return (
    <span className="flex items-center gap-2">
      <Spinner size="xs" />
      {label}
    </span>
  );
}

/**
 * Progress bar for determinate loading
 * Use when you can show percentage progress
 *
 * @example
 * ```tsx
 * <ProgressBar progress={65} label="Uploading file..." />
 * ```
 */
export interface ProgressBarProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
}

export function ProgressBar({ progress, label, showPercentage = true }: ProgressBarProps) {
  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className="space-y-2" role="progressbar" aria-valuenow={clampedProgress} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-muted-foreground">{label}</span>}
          {showPercentage && <span className="font-medium">{Math.round(clampedProgress)}%</span>}
        </div>
      )}
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-in-out"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Pulsing dot indicator
 * Subtle loading indicator
 */
export function PulsingDot({ className }: { className?: string }) {
  return (
    <span className={cn('relative flex h-3 w-3', className)}>
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
      <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
    </span>
  );
}
