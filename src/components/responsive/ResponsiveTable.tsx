import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  hideOnMobile?: boolean;
  mobileLabel?: string;
  sortable?: boolean;
  width?: string;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
  mobileView?: 'cards' | 'list';
  emptyMessage?: string;
  className?: string;
}

/**
 * Responsive table that converts to cards on mobile
 *
 * Features:
 * - Desktop: Full table with all columns
 * - Mobile: Converts to card layout or compact list
 * - Touch-friendly tap targets
 * - Smooth animations
 * - Accessible
 *
 * @example
 * ```tsx
 * <ResponsiveTable
 *   data={users}
 *   columns={[
 *     { key: 'name', label: 'Name' },
 *     { key: 'email', label: 'Email', hideOnMobile: true },
 *     { key: 'status', label: 'Status', render: (value) => <Badge>{value}</Badge> }
 *   ]}
 *   onRowClick={(user) => navigate(`/users/${user.id}`)}
 * />
 * ```
 */
export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
  mobileView = 'cards',
  emptyMessage = 'No data available',
  className,
}: ResponsiveTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className={cn('hidden md:block overflow-x-auto', className)}>
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-muted/50">
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-left text-sm font-medium',
                    'text-muted-foreground',
                    column.width && `w-${column.width}`
                  )}
                >
                  {column.label}
                </th>
              ))}
              {onRowClick && (
                <th className="w-12" aria-label="Actions"></th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'border-b transition-colors',
                  onRowClick && 'cursor-pointer hover:bg-muted/50'
                )}
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-sm">
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key] ?? '-')}
                  </td>
                ))}
                {onRowClick && (
                  <td className="px-4 py-3">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      {mobileView === 'cards' && (
        <div className="md:hidden space-y-4">
          {data.map((row, index) => (
            <div
              key={index}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'border rounded-lg p-4 space-y-3',
                'bg-card text-card-foreground',
                'min-h-touch-target', // Touch-friendly
                onRowClick && 'cursor-pointer active:bg-muted/50 transition-colors'
              )}
            >
              {columns
                .filter((column) => !column.hideOnMobile)
                .map((column) => (
                  <div key={String(column.key)} className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {column.mobileLabel || column.label}
                    </span>
                    <div className="text-sm font-medium">
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] ?? '-')}
                    </div>
                  </div>
                ))}
              {onRowClick && (
                <div className="pt-2 border-t flex justify-end">
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Mobile List View */}
      {mobileView === 'list' && (
        <div className="md:hidden divide-y">
          {data.map((row, index) => (
            <div
              key={index}
              onClick={() => onRowClick?.(row)}
              className={cn(
                'flex items-center justify-between py-3 px-4',
                'min-h-touch-target', // Touch-friendly
                onRowClick && 'cursor-pointer active:bg-muted/50 transition-colors'
              )}
            >
              <div className="flex-1 min-w-0">
                {columns
                  .filter((column) => !column.hideOnMobile)
                  .slice(0, 2) // Show max 2 columns in list view
                  .map((column, colIndex) => (
                    <div
                      key={String(column.key)}
                      className={cn(
                        colIndex === 0 && 'font-medium',
                        colIndex === 1 && 'text-sm text-muted-foreground truncate'
                      )}
                    >
                      {column.render
                        ? column.render(row[column.key], row)
                        : String(row[column.key] ?? '-')}
                    </div>
                  ))}
              </div>
              {onRowClick && (
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0 ml-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Responsive data list - key-value pairs that adapt to screen size
 *
 * @example
 * ```tsx
 * <ResponsiveDataList
 *   data={{
 *     'Name': 'John Doe',
 *     'Email': 'john@example.com',
 *     'Status': <Badge>Active</Badge>
 *   }}
 * />
 * ```
 */
export interface ResponsiveDataListProps {
  data: Record<string, React.ReactNode>;
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export function ResponsiveDataList({
  data,
  orientation = 'horizontal',
  className,
}: ResponsiveDataListProps) {
  return (
    <dl
      className={cn(
        'grid gap-4',
        orientation === 'horizontal'
          ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
          : 'grid-cols-1',
        className
      )}
    >
      {Object.entries(data).map(([key, value]) => (
        <div
          key={key}
          className={cn(
            'space-y-1',
            orientation === 'horizontal' && 'sm:space-y-2'
          )}
        >
          <dt className="text-sm font-medium text-muted-foreground">
            {key}
          </dt>
          <dd className="text-sm font-medium">
            {value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
