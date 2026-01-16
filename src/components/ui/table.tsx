import * as React from "react";

import { cn } from "@/lib/utils";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /** Accessible label for the table */
  'aria-label'?: string;
  /** Caption for screen readers */
  caption?: string;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, caption, ...props }, ref) => (
    <div className="relative w-full overflow-auto" role="region" aria-label={props['aria-label']}>
      <table 
        ref={ref} 
        className={cn("w-full caption-bottom text-sm", className)} 
        role="table"
        {...props} 
      />
      {caption && <caption className="sr-only">{caption}</caption>}
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} role="rowgroup" {...props} />
  ),
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} role="rowgroup" {...props} />
  ),
);
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-muted/50 font-medium [&>tr]:last:border-b-0", className)} role="rowgroup" {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {
  /** Make row focusable and clickable */
  interactive?: boolean;
}

const TableRow = React.forwardRef<HTMLTableRowElement, TableRowProps>(
  ({ className, interactive, onClick, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors data-[state=selected]:bg-muted hover:bg-muted/50",
        interactive && "cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-inset",
        className
      )}
      role="row"
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick) {
          e.preventDefault();
          onClick(e as unknown as React.MouseEvent<HTMLTableRowElement>);
        }
      } : undefined}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  /** Sort direction for sortable columns */
  sortDirection?: 'asc' | 'desc' | 'none';
}

const TableHead = React.forwardRef<HTMLTableCellElement, TableHeadProps>(
  ({ className, sortDirection, ...props }, ref) => (
    <th
      ref={ref}
      scope="col"
      className={cn(
        "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      aria-sort={sortDirection === 'asc' ? 'ascending' : sortDirection === 'desc' ? 'descending' : undefined}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td 
      ref={ref} 
      className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} 
      role="cell"
      {...props} 
    />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
