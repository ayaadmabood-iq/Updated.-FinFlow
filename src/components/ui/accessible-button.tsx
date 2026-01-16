import * as React from 'react';
import { Button, ButtonProps } from './button';
import { cn } from '@/lib/utils';

interface AccessibleButtonProps extends ButtonProps {
  /** Screen reader only label (when icon-only button) */
  srLabel?: string;
  /** Loading state shows spinner and disables button */
  isLoading?: boolean;
  /** Loading text for screen readers */
  loadingText?: string;
  /** Keyboard shortcut hint */
  shortcut?: string;
}

/**
 * Button with enhanced accessibility features:
 * - Screen reader labels for icon-only buttons
 * - Loading state announcements
 * - Keyboard shortcut hints
 */
export const AccessibleButton = React.forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({ 
    srLabel, 
    isLoading, 
    loadingText = 'Loading...', 
    shortcut,
    children, 
    disabled,
    className,
    'aria-label': ariaLabel,
    ...props 
  }, ref) => {
    const label = srLabel || ariaLabel;
    
    return (
      <Button
        ref={ref}
        disabled={disabled || isLoading}
        aria-label={label}
        aria-busy={isLoading}
        aria-disabled={disabled || isLoading}
        className={cn(className)}
        {...props}
      >
        {isLoading ? (
          <>
            <span className="sr-only">{loadingText}</span>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          </>
        ) : (
          <>
            {children}
            {srLabel && <span className="sr-only">{srLabel}</span>}
          </>
        )}
        {shortcut && (
          <kbd className="ml-2 text-xs opacity-60 hidden sm:inline">
            {shortcut}
          </kbd>
        )}
      </Button>
    );
  }
);
AccessibleButton.displayName = 'AccessibleButton';
