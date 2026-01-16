// ============= Live Region Component =============
// WCAG 2.1 AA compliant screen reader announcements

import React, { useEffect, useState } from 'react';

export interface LiveRegionProps {
  /** The announcement message */
  message: string;

  /** How assertive the announcement should be */
  politeness?: 'polite' | 'assertive' | 'off';

  /** Whether updates should be announced atomically */
  atomic?: boolean;

  /** Additional CSS classes */
  className?: string;
}

/**
 * LiveRegion - Screen reader announcement component
 *
 * Creates a live region for dynamic content updates that are announced
 * to screen reader users.
 *
 * Politeness levels:
 * - 'polite': Announce when convenient (default)
 * - 'assertive': Announce immediately, interrupting current speech
 * - 'off': Do not announce
 *
 * WCAG 2.1 Success Criterion 4.1.3 (Status Messages) - Level AA
 *
 * @example
 * ```tsx
 * const [message, setMessage] = useState('');
 *
 * const handleSave = () => {
 *   saveData();
 *   setMessage('Changes saved successfully');
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleSave}>Save</button>
 *     <LiveRegion message={message} politeness="polite" />
 *   </>
 * );
 * ```
 */
export const LiveRegion: React.FC<LiveRegionProps> = ({
  message,
  politeness = 'polite',
  atomic = true,
  className = '',
}) => {
  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic={atomic}
      className={`sr-only ${className}`}
    >
      {message}
    </div>
  );
};

/**
 * Alert - ARIA alert component
 *
 * For important, time-sensitive information.
 * Automatically sets aria-live="assertive".
 *
 * @example
 * ```tsx
 * <Alert>
 *   Form submission failed. Please try again.
 * </Alert>
 * ```
 */
export const Alert: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div role="alert" aria-live="assertive" aria-atomic="true" className={className}>
      {children}
    </div>
  );
};

/**
 * Status - ARIA status component
 *
 * For status updates that are not critical.
 * Uses aria-live="polite".
 *
 * @example
 * ```tsx
 * <Status>
 *   3 items added to cart
 * </Status>
 * ```
 */
export const Status: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  return (
    <div role="status" aria-live="polite" aria-atomic="true" className={className}>
      {children}
    </div>
  );
};

/**
 * VisuallyHidden - Hides content visually but keeps it accessible
 *
 * Content is visible to screen readers but hidden visually.
 *
 * @example
 * ```tsx
 * <button>
 *   <TrashIcon />
 *   <VisuallyHidden>Delete item</VisuallyHidden>
 * </button>
 * ```
 */
export const VisuallyHidden: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <span className="sr-only">{children}</span>;
};

/**
 * LoadingAnnouncer - Announces loading states
 *
 * Automatically announces loading state changes.
 *
 * @example
 * ```tsx
 * const [loading, setLoading] = useState(false);
 *
 * return (
 *   <>
 *     <LoadingAnnouncer
 *       isLoading={loading}
 *       loadingMessage="Loading data..."
 *       completedMessage="Data loaded"
 *     />
 *     <button onClick={() => fetchData()}>Load</button>
 *   </>
 * );
 * ```
 */
export const LoadingAnnouncer: React.FC<{
  isLoading: boolean;
  loadingMessage?: string;
  completedMessage?: string;
}> = ({ isLoading, loadingMessage = 'Loading...', completedMessage = 'Loading complete' }) => {
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isLoading) {
      setMessage(loadingMessage);
    } else if (message === loadingMessage) {
      setMessage(completedMessage);
      // Clear message after announcement
      const timer = setTimeout(() => setMessage(''), 1000);
      return () => clearTimeout(timer);
    }
  }, [isLoading, loadingMessage, completedMessage, message]);

  return <LiveRegion message={message} politeness="polite" />;
};
