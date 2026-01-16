import React from 'react';
import { FileText, Search, FolderOpen, Inbox, Plus, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Generic empty state component
 * Use for any empty collection or missing data scenario
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<FileText />}
 *   title="No documents"
 *   message="Get started by creating your first document"
 *   action={{ label: "Create document", onClick: () => navigate('/create') }}
 * />
 * ```
 */
export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
  secondaryAction,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center min-h-[400px]',
        className
      )}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="mb-4 text-muted-foreground" aria-hidden="true">
          {React.cloneElement(icon as React.ReactElement, {
            className: 'h-16 w-16',
          })}
        </div>
      )}

      <h2 className="text-2xl font-bold text-foreground mb-2">{title}</h2>

      <p className="text-muted-foreground mb-6 max-w-md">{message}</p>

      {(action || secondaryAction) && (
        <div className="flex flex-wrap gap-3 justify-center">
          {action && (
            <button
              onClick={action.onClick}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'transition-colors',
                'min-h-touch-target' // Touch-friendly
              )}
              aria-label={action.label}
            >
              {action.icon && (
                <span aria-hidden="true">
                  {React.cloneElement(action.icon as React.ReactElement, {
                    className: 'h-4 w-4',
                  })}
                </span>
              )}
              {action.label}
            </button>
          )}

          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                'border border-input bg-background',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'transition-colors',
                'min-h-touch-target' // Touch-friendly
              )}
              aria-label={secondaryAction.label}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Empty state for no projects
 * Specialized component for when a user has no projects yet
 *
 * @example
 * ```tsx
 * <NoProjectsState
 *   onCreateProject={() => navigate('/projects/new')}
 *   onImportProject={() => setShowImportModal(true)}
 * />
 * ```
 */
export interface NoProjectsStateProps {
  onCreateProject?: () => void;
  onImportProject?: () => void;
  className?: string;
}

export function NoProjectsState({
  onCreateProject,
  onImportProject,
  className,
}: NoProjectsStateProps) {
  return (
    <EmptyState
      icon={<FolderOpen />}
      title="No projects yet"
      message="Create your first project to get started with FineFlow Foundation"
      action={
        onCreateProject
          ? {
              label: 'Create project',
              onClick: onCreateProject,
              icon: <Plus />,
            }
          : undefined
      }
      secondaryAction={
        onImportProject
          ? {
              label: 'Import project',
              onClick: onImportProject,
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * Empty state for no documents
 * Specialized component for when a user has no documents
 *
 * @example
 * ```tsx
 * <NoDocumentsState
 *   onCreateDocument={() => navigate('/documents/new')}
 *   onUploadDocument={() => fileInputRef.current?.click()}
 * />
 * ```
 */
export interface NoDocumentsStateProps {
  onCreateDocument?: () => void;
  onUploadDocument?: () => void;
  context?: 'project' | 'workspace' | 'global';
  className?: string;
}

export function NoDocumentsState({
  onCreateDocument,
  onUploadDocument,
  context = 'global',
  className,
}: NoDocumentsStateProps) {
  const messages = {
    project: 'This project has no documents yet. Create or upload your first document.',
    workspace: 'This workspace has no documents yet. Create or upload your first document.',
    global: 'You have no documents yet. Create or upload your first document.',
  };

  return (
    <EmptyState
      icon={<FileText />}
      title="No documents"
      message={messages[context]}
      action={
        onCreateDocument
          ? {
              label: 'Create document',
              onClick: onCreateDocument,
              icon: <Plus />,
            }
          : undefined
      }
      secondaryAction={
        onUploadDocument
          ? {
              label: 'Upload document',
              onClick: onUploadDocument,
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * Empty state for no search results
 * Specialized component for when a search returns no results
 *
 * @example
 * ```tsx
 * <NoSearchResultsState
 *   searchTerm={query}
 *   onClearSearch={() => setQuery('')}
 *   onRefineSearch={() => setShowFilters(true)}
 * />
 * ```
 */
export interface NoSearchResultsStateProps {
  searchTerm?: string;
  onClearSearch?: () => void;
  onRefineSearch?: () => void;
  suggestions?: string[];
  className?: string;
}

export function NoSearchResultsState({
  searchTerm,
  onClearSearch,
  onRefineSearch,
  suggestions,
  className,
}: NoSearchResultsStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 text-center min-h-[400px]',
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mb-4 text-muted-foreground" aria-hidden="true">
        <Search className="h-16 w-16" />
      </div>

      <h2 className="text-2xl font-bold text-foreground mb-2">No results found</h2>

      <p className="text-muted-foreground mb-6 max-w-md">
        {searchTerm ? (
          <>
            We couldn't find any results for "<span className="font-semibold">{searchTerm}</span>".
            Try adjusting your search or clearing filters.
          </>
        ) : (
          "We couldn't find any results. Try adjusting your search or clearing filters."
        )}
      </p>

      {suggestions && suggestions.length > 0 && (
        <div className="mb-6 text-left max-w-md w-full">
          <p className="text-sm font-medium text-foreground mb-2">Suggestions:</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-primary mt-0.5">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(onClearSearch || onRefineSearch) && (
        <div className="flex flex-wrap gap-3 justify-center">
          {onClearSearch && (
            <button
              onClick={onClearSearch}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                'bg-primary text-primary-foreground',
                'hover:bg-primary/90',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'transition-colors',
                'min-h-touch-target'
              )}
              aria-label="Clear search"
            >
              Clear search
            </button>
          )}

          {onRefineSearch && (
            <button
              onClick={onRefineSearch}
              className={cn(
                'inline-flex items-center gap-2 px-4 py-2 rounded-lg',
                'border border-input bg-background',
                'hover:bg-accent hover:text-accent-foreground',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'transition-colors',
                'min-h-touch-target'
              )}
              aria-label="Refine search"
            >
              Refine search
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Empty state for inbox/notifications
 * Specialized component for when there are no notifications or messages
 *
 * @example
 * ```tsx
 * <NoNotificationsState onRefresh={() => refetch()} />
 * ```
 */
export interface NoNotificationsStateProps {
  onRefresh?: () => void;
  className?: string;
}

export function NoNotificationsState({ onRefresh, className }: NoNotificationsStateProps) {
  return (
    <EmptyState
      icon={<Inbox />}
      title="All caught up!"
      message="You have no new notifications. Check back later for updates."
      action={
        onRefresh
          ? {
              label: 'Refresh',
              onClick: onRefresh,
              icon: <RefreshCw />,
            }
          : undefined
      }
      className={className}
    />
  );
}

/**
 * Compact empty state for small sections
 * Use inside cards or small containers
 *
 * @example
 * ```tsx
 * <CompactEmptyState
 *   message="No items to display"
 *   action={{ label: "Add item", onClick: () => setShowAddModal(true) }}
 * />
 * ```
 */
export interface CompactEmptyStateProps {
  icon?: React.ReactNode;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function CompactEmptyState({
  icon,
  message,
  action,
  className,
}: CompactEmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center p-6 text-center', className)}
      role="status"
      aria-live="polite"
    >
      {icon && (
        <div className="mb-3 text-muted-foreground" aria-hidden="true">
          {React.cloneElement(icon as React.ReactElement, {
            className: 'h-8 w-8',
          })}
        </div>
      )}

      <p className="text-sm text-muted-foreground mb-3">{message}</p>

      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg',
            'bg-primary text-primary-foreground',
            'hover:bg-primary/90',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'transition-colors',
            'min-h-touch-target'
          )}
          aria-label={action.label}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
