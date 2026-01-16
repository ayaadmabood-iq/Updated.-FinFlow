import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card } from './card';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  /** Hide this column on mobile (< 768px) */
  hideOnMobile?: boolean;
  /** Hide this column on tablet (< 1024px) */
  hideOnTablet?: boolean;
  /** Priority for mobile card view (lower = shown first) */
  priority?: number;
  /** Screen reader only - visually hidden but accessible */
  srOnly?: boolean;
  /** Custom className for the cell */
  className?: string;
  /** Right align content */
  alignRight?: boolean;
}

interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowKey: (item: T) => string;
  isLoading?: boolean;
  loadingRows?: number;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  /** Use card layout on mobile instead of horizontal scroll */
  cardLayoutOnMobile?: boolean;
  /** Custom aria-label for the table */
  'aria-label'?: string;
  /** Caption for the table (for accessibility) */
  caption?: string;
}

function SkeletonRow({ columns }: { columns: number }) {
  return (
    <tr className="animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <div className="h-4 bg-muted rounded w-3/4" />
        </td>
      ))}
    </tr>
  );
}

function MobileCard<T>({ 
  item, 
  columns, 
  onClick 
}: { 
  item: T; 
  columns: Column<T>[]; 
  onClick?: () => void;
}) {
  // Sort columns by priority for mobile view
  const sortedColumns = [...columns].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99));
  
  return (
    <Card 
      className={cn(
        'p-4 space-y-2',
        onClick && 'cursor-pointer hover:bg-muted/50 transition-colors'
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      } : undefined}
    >
      {sortedColumns.slice(0, 4).map((column) => (
        <div key={column.key} className="flex justify-between items-start gap-2">
          <span className="text-sm text-muted-foreground font-medium">
            {column.header}
          </span>
          <span className={cn('text-sm text-right', column.className)}>
            {column.render(item)}
          </span>
        </div>
      ))}
    </Card>
  );
}

export function ResponsiveTable<T>({
  data,
  columns,
  getRowKey,
  isLoading,
  loadingRows = 5,
  emptyMessage = 'No data available',
  onRowClick,
  cardLayoutOnMobile = true,
  'aria-label': ariaLabel,
  caption,
}: ResponsiveTableProps<T>) {
  const visibleColumns = columns.filter(col => !col.srOnly);
  
  return (
    <>
      {/* Mobile Card View */}
      {cardLayoutOnMobile && (
        <div 
          className="md:hidden space-y-3" 
          role="list"
          aria-label={ariaLabel || caption}
        >
          {isLoading ? (
            Array.from({ length: loadingRows }).map((_, i) => (
              <Card key={i} className="p-4 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-1/2" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-4 bg-muted rounded w-1/3" />
                </div>
              </Card>
            ))
          ) : data.length === 0 ? (
            <div 
              className="text-center py-8 text-muted-foreground"
              role="status"
              aria-live="polite"
            >
              {emptyMessage}
            </div>
          ) : (
            data.map((item) => (
              <MobileCard
                key={getRowKey(item)}
                item={item}
                columns={columns}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
              />
            ))
          )}
        </div>
      )}

      {/* Desktop Table View */}
      <div 
        className={cn(
          'relative w-full overflow-auto',
          cardLayoutOnMobile && 'hidden md:block'
        )}
      >
        <table 
          className="w-full caption-bottom text-sm"
          role="table"
          aria-label={ariaLabel}
        >
          {caption && (
            <caption className="sr-only">{caption}</caption>
          )}
          <thead className="[&_tr]:border-b">
            <tr className="border-b transition-colors hover:bg-muted/50">
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
                    column.hideOnMobile && 'hidden md:table-cell',
                    column.hideOnTablet && 'hidden lg:table-cell',
                    column.alignRight && 'text-right',
                    column.className
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {isLoading ? (
              Array.from({ length: loadingRows }).map((_, i) => (
                <SkeletonRow key={i} columns={visibleColumns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td 
                  colSpan={visibleColumns.length} 
                  className="text-center py-8 text-muted-foreground"
                  role="status"
                  aria-live="polite"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((item) => (
                <tr
                  key={getRowKey(item)}
                  className={cn(
                    'border-b transition-colors hover:bg-muted/50',
                    onRowClick && 'cursor-pointer'
                  )}
                  onClick={onRowClick ? () => onRowClick(item) : undefined}
                  tabIndex={onRowClick ? 0 : undefined}
                  role={onRowClick ? 'button' : undefined}
                  onKeyDown={onRowClick ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onRowClick(item);
                    }
                  } : undefined}
                >
                  {visibleColumns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'p-4 align-middle',
                        column.hideOnMobile && 'hidden md:table-cell',
                        column.hideOnTablet && 'hidden lg:table-cell',
                        column.alignRight && 'text-right',
                        column.className
                      )}
                    >
                      {column.render(item)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export type { Column };
