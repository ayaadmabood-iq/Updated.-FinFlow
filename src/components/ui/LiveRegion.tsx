import React, { useEffect, useRef } from 'react';

export interface LiveRegionProps {
  message: string;
  politeness?: 'polite' | 'assertive' | 'off';
  clearAfter?: number;
}

/**
 * Live region for screen reader announcements
 *
 * @example
 * ```tsx
 * <LiveRegion
 *   message="Document saved successfully"
 *   politeness="polite"
 *   clearAfter={3000}
 * />
 * ```
 */
export function LiveRegion({
  message,
  politeness = 'polite',
  clearAfter = 5000,
}: LiveRegionProps) {
  const [currentMessage, setCurrentMessage] = React.useState(message);
  const timeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    setCurrentMessage(message);

    if (clearAfter > 0) {
      timeoutRef.current = setTimeout(() => {
        setCurrentMessage('');
      }, clearAfter);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [message, clearAfter]);

  return (
    <div
      role="status"
      aria-live={politeness}
      aria-atomic="true"
      className="sr-only"
    >
      {currentMessage}
    </div>
  );
}

/**
 * Hook for announcing messages to screen readers
 */
export function useScreenReaderAnnouncement() {
  const [message, setMessage] = React.useState('');

  const announce = (text: string, politeness: 'polite' | 'assertive' = 'polite') => {
    setMessage(''); // Clear first to ensure announcement
    setTimeout(() => setMessage(text), 100);
  };

  return { message, announce };
}
