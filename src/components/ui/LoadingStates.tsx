// ============= Loading States Components =============
// WCAG-compliant loading indicators with screen reader support

import React from 'react';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

/**
 * Spinner component for loading states
 *
 * Includes proper ARIA attributes for screen reader announcements.
 */
export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <svg
      className={`animate-spin text-blue-600 ${sizeClasses[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Loading"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

/**
 * Full page loading overlay
 *
 * @example
 * ```tsx
 * {isLoading && <LoadingOverlay message="Processing document..." />}
 * ```
 */
export function LoadingOverlay({ message = 'Loading...' }: { message?: string }) {
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="alert"
      aria-busy="true"
      aria-label={message}
    >
      <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4 shadow-xl">
        <Spinner size="lg" />
        <p className="text-gray-700 font-medium">{message}</p>
      </div>
    </div>
  );
}

/**
 * Skeleton loader for content
 *
 * @example
 * ```tsx
 * <Skeleton className="h-4 w-3/4" />
 * <Skeleton className="h-20 w-full mt-2" />
 * ```
 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div
      className={`animate-pulse bg-gray-200 rounded ${className}`}
      role="status"
      aria-label="Loading content"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}

/**
 * Card skeleton loader
 *
 * Displays a skeleton for card-based content.
 */
export function CardSkeleton() {
  return (
    <div className="border rounded-lg p-4 space-y-3" role="status" aria-label="Loading card">
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-20 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

/**
 * Table skeleton loader
 *
 * @example
 * ```tsx
 * {isLoading ? (
 *   <TableSkeleton rows={10} columns={5} />
 * ) : (
 *   <table>...</table>
 * )}
 * ```
 */
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2" role="status" aria-label="Loading table">
      {/* Header */}
      <div className="flex gap-4 pb-2 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={`header-${i}`} className="h-4 flex-1" />
        ))}
      </div>

      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={`row-${rowIndex}`} className="flex gap-4 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={`cell-${rowIndex}-${colIndex}`} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * List skeleton loader
 *
 * @example
 * ```tsx
 * {isLoading ? <ListSkeleton items={5} /> : <ItemList items={data} />}
 * ```
 */
export function ListSkeleton({ items = 5 }: { items?: number }) {
  return (
    <div className="space-y-3" role="status" aria-label="Loading list">
      {Array.from({ length: items }).map((_, i) => (
        <div key={`list-item-${i}`} className="flex items-center gap-3 p-3 border rounded-lg">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Inline loading indicator
 *
 * @example
 * ```tsx
 * <InlineLoading message="Saving changes..." />
 * ```
 */
export function InlineLoading({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-600" role="status" aria-live="polite">
      <Spinner size="sm" />
      <span>{message}</span>
    </div>
  );
}

/**
 * Button loading state
 *
 * @example
 * ```tsx
 * <button disabled={isLoading}>
 *   {isLoading ? <ButtonLoading /> : 'Save'}
 * </button>
 * ```
 */
export function ButtonLoading() {
  return (
    <div className="flex items-center gap-2">
      <Spinner size="sm" className="text-current" />
      <span>Loading...</span>
    </div>
  );
}

/**
 * Page loading state with skeleton
 *
 * Full page skeleton for initial page loads.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6 p-6" role="status" aria-label="Loading page">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>

      {/* Main content */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/4" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    </div>
  );
}

/**
 * Progress bar with percentage
 *
 * @example
 * ```tsx
 * <ProgressBar progress={uploadProgress} label="Uploading..." />
 * ```
 */
export function ProgressBar({
  progress,
  label
}: {
  progress: number;
  label?: string;
}) {
  return (
    <div className="w-full" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
      {label && (
        <div className="flex justify-between mb-2">
          <span className="text-sm text-gray-700">{label}</span>
          <span className="text-sm text-gray-600">{Math.round(progress)}%</span>
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-600 transition-all duration-300 ease-out"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
    </div>
  );
}
