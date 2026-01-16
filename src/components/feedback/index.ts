/**
 * Feedback Components
 * Comprehensive user feedback system including loading states, error handling,
 * empty states, and toast notifications
 */

// Loading States
export {
  Spinner,
  LoadingOverlay,
  Skeleton,
  CardSkeleton,
  TableSkeleton,
  ListSkeleton,
  InlineLoading,
  LoadingButton,
  ProgressBar,
  PulsingDot,
} from './LoadingStates';
export type {
  SpinnerProps,
  LoadingOverlayProps,
  SkeletonProps,
  CardSkeletonProps,
  TableSkeletonProps,
  ListSkeletonProps,
  InlineLoadingProps,
  LoadingButtonProps,
  ProgressBarProps,
  PulsingDotProps,
} from './LoadingStates';

// Error States
export {
  ErrorState,
  InlineError,
  FieldError,
  ErrorBanner,
  ErrorFallback,
  NetworkError,
  NotFoundError,
  PermissionDeniedError,
} from './ErrorStates';
export type {
  ErrorStateProps,
  InlineErrorProps,
  FieldErrorProps,
  ErrorBannerProps,
  ErrorFallbackProps,
} from './ErrorStates';

// Empty States
export {
  EmptyState,
  NoProjectsState,
  NoDocumentsState,
  NoSearchResultsState,
  NoNotificationsState,
  CompactEmptyState,
} from './EmptyStates';
export type {
  EmptyStateProps,
  NoProjectsStateProps,
  NoDocumentsStateProps,
  NoSearchResultsStateProps,
  NoNotificationsStateProps,
  CompactEmptyStateProps,
} from './EmptyStates';

// Toast Notifications
export {
  ToastProvider,
  useToast,
  useToastWithPromise,
  toastPromise,
} from './Toast';
export type { Toast, ToastType } from './Toast';
