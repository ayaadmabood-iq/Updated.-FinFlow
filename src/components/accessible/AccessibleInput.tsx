// ============= Accessible Input Component =============
// WCAG 2.1 AA compliant input with proper labeling and error handling

import React, { forwardRef, InputHTMLAttributes, useId } from 'react';

export interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label text */
  label: string;

  /** Helper text displayed below input */
  helperText?: string;

  /** Error message */
  error?: string;

  /** Hide label visually (still accessible to screen readers) */
  hiddenLabel?: boolean;

  /** Icon element */
  icon?: React.ReactNode;

  /** Icon position */
  iconPosition?: 'left' | 'right';
}

/**
 * AccessibleInput - WCAG 2.1 AA compliant input component
 *
 * Features:
 * - Automatic label association
 * - Error state with aria-invalid and aria-describedby
 * - Helper text for additional context
 * - Visually hidden label option (still accessible)
 * - Focus visible indicator
 *
 * @example
 * <AccessibleInput
 *   label="Email Address"
 *   type="email"
 *   error={errors.email}
 *   helperText="We'll never share your email"
 * />
 *
 * @example
 * // Icon input
 * <AccessibleInput
 *   label="Search"
 *   icon={<SearchIcon />}
 *   iconPosition="left"
 * />
 */
export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  (
    {
      label,
      helperText,
      error,
      hiddenLabel = false,
      icon,
      iconPosition = 'left',
      className = '',
      id,
      required,
      disabled,
      ...props
    },
    ref
  ) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const helperTextId = `${inputId}-helper`;
    const errorId = `${inputId}-error`;

    const hasError = Boolean(error);

    const labelClasses = hiddenLabel
      ? 'sr-only' // Screen reader only
      : 'block text-sm font-medium text-gray-700 mb-1';

    const inputBaseClasses = [
      'w-full px-3 py-2 rounded-lg border',
      'transition-colors duration-150',
      'focus:outline-none focus:ring-2 focus:ring-offset-1',
      'disabled:bg-gray-100 disabled:cursor-not-allowed',
      hasError
        ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
        : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500',
    ].join(' ');

    const describedBy = [
      helperText && helperTextId,
      error && errorId,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={className}>
        <label htmlFor={inputId} className={labelClasses}>
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>

        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`${inputBaseClasses} ${icon && iconPosition === 'left' ? 'pl-10' : ''} ${icon && iconPosition === 'right' ? 'pr-10' : ''}`}
            aria-invalid={hasError}
            aria-describedby={describedBy || undefined}
            aria-required={required}
            disabled={disabled}
            {...props}
          />

          {icon && iconPosition === 'right' && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden="true">
              {icon}
            </div>
          )}
        </div>

        {helperText && !error && (
          <p id={helperTextId} className="mt-1 text-sm text-gray-500">
            {helperText}
          </p>
        )}

        {error && (
          <p id={errorId} className="mt-1 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }
);

AccessibleInput.displayName = 'AccessibleInput';
