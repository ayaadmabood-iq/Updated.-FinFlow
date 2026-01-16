// ============= Accessible Button Component =============
// WCAG 2.1 AA compliant button with keyboard navigation and screen reader support

import React, { forwardRef, ButtonHTMLAttributes } from 'react';

export interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual label for the button */
  children?: React.ReactNode;

  /** Accessible label for screen readers (required for icon-only buttons) */
  'aria-label'?: string;

  /** Variant styling */
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';

  /** Size */
  size?: 'sm' | 'md' | 'lg';

  /** Loading state */
  isLoading?: boolean;

  /** Icon element */
  icon?: React.ReactNode;

  /** Icon position */
  iconPosition?: 'left' | 'right';
}

const variantStyles = {
  primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
  secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900 focus:ring-gray-500',
  danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 focus:ring-gray-500',
};

const sizeStyles = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-base',
  lg: 'px-6 py-3 text-lg',
};

/**
 * AccessibleButton - WCAG 2.1 AA compliant button component
 *
 * Features:
 * - Keyboard navigation (Enter, Space)
 * - Focus visible indicator
 * - ARIA attributes for screen readers
 * - Disabled state handling
 * - Loading state with aria-busy
 *
 * @example
 * // Icon-only button (requires aria-label)
 * <AccessibleButton aria-label="Close dialog" icon={<CloseIcon />} />
 *
 * @example
 * // Text button with icon
 * <AccessibleButton icon={<SaveIcon />} iconPosition="left">
 *   Save Changes
 * </AccessibleButton>
 */
export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  (
    {
      children,
      'aria-label': ariaLabel,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      iconPosition = 'left',
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    // Validate: icon-only buttons must have aria-label
    if (!children && !ariaLabel && icon) {
      console.warn('AccessibleButton: Icon-only buttons must have an aria-label');
    }

    const baseStyles = [
      'inline-flex items-center justify-center gap-2',
      'font-medium rounded-lg',
      'transition-colors duration-150',
      'focus:outline-none focus:ring-2 focus:ring-offset-2',
      'disabled:opacity-50 disabled:cursor-not-allowed',
    ].join(' ');

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        aria-label={ariaLabel}
        aria-busy={isLoading}
        disabled={disabled || isLoading}
        type={props.type || 'button'}
        {...props}
      >
        {isLoading && (
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
        )}

        {!isLoading && icon && iconPosition === 'left' && (
          <span aria-hidden="true">{icon}</span>
        )}

        {children && <span>{children}</span>}

        {!isLoading && icon && iconPosition === 'right' && (
          <span aria-hidden="true">{icon}</span>
        )}
      </button>
    );
  }
);

AccessibleButton.displayName = 'AccessibleButton';
