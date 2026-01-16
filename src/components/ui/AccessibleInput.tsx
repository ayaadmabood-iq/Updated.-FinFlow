import React, { forwardRef, useId } from 'react';
import { cn } from '@/lib/utils';

export interface AccessibleInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  showRequiredIndicator?: boolean;
}

/**
 * Fully accessible input component with WCAG 2.1 AA compliance
 *
 * Features:
 * - Proper label association
 * - Error announcements for screen readers
 * - Required field indicators
 * - Helper text support
 * - Focus management
 */
export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  (
    {
      label,
      error,
      helperText,
      required = false,
      showRequiredIndicator = true,
      className,
      id: providedId,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const id = providedId || generatedId;
    const errorId = `${id}-error`;
    const helperId = `${id}-helper`;

    return (
      <div className="w-full">
        <label
          htmlFor={id}
          className={cn(
            'block text-sm font-medium text-gray-700 mb-1',
            required && 'after:content-["*"] after:ml-0.5 after:text-red-500'
          )}
        >
          {label}
          {required && showRequiredIndicator && (
            <span className="sr-only">(required)</span>
          )}
        </label>

        <input
          ref={ref}
          id={id}
          required={required}
          aria-required={required}
          aria-invalid={!!error}
          aria-describedby={cn(
            error && errorId,
            helperText && helperId
          )}
          className={cn(
            // Base styles
            'w-full px-3 py-2 border rounded-lg',
            'text-gray-900 placeholder-gray-400',
            'transition-colors duration-200',

            // Focus styles
            'focus:outline-none focus:ring-2 focus:ring-offset-1',

            // State styles
            error
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',

            // Disabled styles
            props.disabled && 'bg-gray-100 cursor-not-allowed opacity-60',

            // Custom classes
            className
          )}
          {...props}
        />

        {helperText && !error && (
          <p
            id={helperId}
            className="mt-1 text-sm text-gray-500"
          >
            {helperText}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            role="alert"
            aria-live="polite"
            className="mt-1 text-sm text-red-600"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';
