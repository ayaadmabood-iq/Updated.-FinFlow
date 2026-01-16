import * as React from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { cn } from '@/lib/utils';

interface VirtualizedListProps<T> {
  items: T[];
  height: number;
  estimateSize: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  className?: string;
  overscan?: number;
  getItemKey?: (item: T, index: number) => string | number;
  emptyMessage?: string;
  'aria-label'?: string;
}

export function VirtualizedList<T>({
  items,
  height,
  estimateSize,
  renderItem,
  className,
  overscan = 5,
  getItemKey,
  emptyMessage = 'No items to display',
  'aria-label': ariaLabel,
}: VirtualizedListProps<T>) {
  const parentRef = React.useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
    getItemKey: getItemKey ? (index) => getItemKey(items[index], index) : undefined,
  });

  if (items.length === 0) {
    return (
      <div 
        className={cn('flex items-center justify-center text-muted-foreground py-8', className)}
        role="status"
        aria-live="polite"
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn('overflow-auto', className)}
      style={{ height }}
      role="list"
      aria-label={ariaLabel}
      tabIndex={0}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => (
          <div
            key={virtualItem.key}
            role="listitem"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: `${virtualItem.size}px`,
              transform: `translateY(${virtualItem.start}px)`,
            }}
          >
            {renderItem(items[virtualItem.index], virtualItem.index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// Hook for external use
export function useVirtualList<T>(options: {
  items: T[];
  estimateSize: number;
  parentRef: React.RefObject<HTMLElement>;
  overscan?: number;
}) {
  return useVirtualizer({
    count: options.items.length,
    getScrollElement: () => options.parentRef.current,
    estimateSize: () => options.estimateSize,
    overscan: options.overscan ?? 5,
  });
}
