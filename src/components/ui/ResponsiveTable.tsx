import React from 'react';
import { cn } from '@/lib/utils';

export interface Column<T> {
  key: keyof T;
  label: string;
  render?: (value: T[keyof T], row: T) => React.ReactNode;
  hideOnMobile?: boolean;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (row: T) => void;
}

/**
 * Responsive table that converts to cards on mobile
 */
export function ResponsiveTable<T extends Record<string, any>>({
  data,
  columns,
  onRowClick,
}: ResponsiveTableProps<T>) {
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  className="px-4 py-3 text-left text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((row, index) => (
              <tr
                key={index}
                onClick={() => onRowClick?.(row)}
                className={cn(
                  'hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
              >
                {columns.map((column) => (
                  <td key={String(column.key)} className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key])}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-4">
        {data.map((row, index) => (
          <div
            key={index}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'border border-gray-200 dark:border-gray-700 rounded-lg p-4 space-y-2 bg-white dark:bg-gray-900',
              onRowClick && 'cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 min-h-[48px]'
            )}
          >
            {columns
              .filter((column) => !column.hideOnMobile)
              .map((column) => (
                <div key={String(column.key)} className="flex justify-between items-start gap-4">
                  <span className="font-medium text-gray-700 dark:text-gray-300 flex-shrink-0">
                    {column.label}:
                  </span>
                  <span className="text-gray-900 dark:text-gray-100 text-right">
                    {column.render
                      ? column.render(row[column.key], row)
                      : String(row[column.key])}
                  </span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </>
  );
}
