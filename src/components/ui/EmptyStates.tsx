// ============= Empty State Components =============
// User-friendly empty states for various scenarios

import React from 'react';
import { AccessibleButton } from '../accessible/AccessibleButton';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
  };
}

/**
 * Generic empty state component
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<InboxIcon />}
 *   title="No messages"
 *   description="You don't have any messages yet."
 *   action={{
 *     label: 'Compose Message',
 *     onClick: () => openComposer()
 *   }}
 * />
 * ```
 */
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  const DefaultIcon = () => (
    <svg
      className="h-16 w-16"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  );

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
      <div className="mb-4 text-gray-400" aria-hidden="true">
        {icon || <DefaultIcon />}
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>

      <p className="text-gray-600 mb-6 max-w-md">{description}</p>

      {action && (
        <AccessibleButton onClick={action.onClick} variant="primary" aria-label={action.label}>
          {action.icon}
          {action.label}
        </AccessibleButton>
      )}
    </div>
  );
}

/**
 * No projects empty state
 *
 * @example
 * ```tsx
 * {projects.length === 0 && <NoProjectsState onCreate={() => setShowCreateDialog(true)} />}
 * ```
 */
export function NoProjectsState({ onCreate }: { onCreate: () => void }) {
  const FolderIcon = () => (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
  );

  return (
    <EmptyState
      icon={<FolderIcon />}
      title="No projects yet"
      description="Get started by creating your first project. Projects help you organize your documents and AI workflows."
      action={{
        label: 'Create Your First Project',
        onClick: onCreate,
        icon: (
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        ),
      }}
    />
  );
}

/**
 * No documents empty state
 *
 * @example
 * ```tsx
 * {documents.length === 0 && <NoDocumentsState onUpload={() => openUploadDialog()} />}
 * ```
 */
export function NoDocumentsState({ onUpload }: { onUpload: () => void }) {
  const FileIcon = () => (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
      />
    </svg>
  );

  return (
    <EmptyState
      icon={<FileIcon />}
      title="No documents yet"
      description="Upload your first document to start analyzing and processing with AI."
      action={{
        label: 'Upload Document',
        onClick: onUpload,
        icon: (
          <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        ),
      }}
    />
  );
}

/**
 * No search results empty state
 *
 * @example
 * ```tsx
 * {results.length === 0 && <NoSearchResultsState query={searchQuery} />}
 * ```
 */
export function NoSearchResultsState({ query }: { query: string }) {
  const SearchIcon = () => (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  );

  return (
    <EmptyState
      icon={<SearchIcon />}
      title="No results found"
      description={`We couldn't find anything matching "${query}". Try adjusting your search terms or filters.`}
    />
  );
}

/**
 * No data sources empty state
 */
export function NoDataSourcesState({ onAdd }: { onAdd: () => void }) {
  const DatabaseIcon = () => (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"
      />
    </svg>
  );

  return (
    <EmptyState
      icon={<DatabaseIcon />}
      title="No data sources"
      description="Add your first data source to start ingesting and processing data."
      action={{
        label: 'Add Data Source',
        onClick: onAdd,
      }}
    />
  );
}

/**
 * No notifications empty state
 */
export function NoNotificationsState() {
  const BellIcon = () => (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
      />
    </svg>
  );

  return (
    <EmptyState
      icon={<BellIcon />}
      title="No notifications"
      description="You're all caught up! You'll see notifications here when there's new activity."
    />
  );
}

/**
 * No team members empty state
 */
export function NoTeamMembersState({ onInvite }: { onInvite: () => void }) {
  const UsersIcon = () => (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );

  return (
    <EmptyState
      icon={<UsersIcon />}
      title="No team members"
      description="Invite team members to collaborate on projects and share resources."
      action={{
        label: 'Invite Team Members',
        onClick: onInvite,
      }}
    />
  );
}

/**
 * No activity empty state
 */
export function NoActivityState() {
  const ClockIcon = () => (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  return (
    <EmptyState
      icon={<ClockIcon />}
      title="No recent activity"
      description="Your activity history will appear here as you interact with the platform."
    />
  );
}

/**
 * Content filtered out empty state
 */
export function FilteredEmptyState({ onClearFilters }: { onClearFilters: () => void }) {
  const FilterIcon = () => (
    <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );

  return (
    <EmptyState
      icon={<FilterIcon />}
      title="No results match your filters"
      description="Try adjusting or clearing your filters to see more results."
      action={{
        label: 'Clear All Filters',
        onClick: onClearFilters,
      }}
    />
  );
}
