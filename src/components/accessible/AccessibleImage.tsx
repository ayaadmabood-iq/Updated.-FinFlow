// ============= Accessible Image Component =============
// WCAG 2.1 AA compliant image with mandatory alt text

import React, { ImgHTMLAttributes, useState } from 'react';

export interface AccessibleImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'alt'> {
  /** Alt text (required for all images) */
  alt: string;

  /**
   * Whether the image is decorative (alt will be set to "")
   * Use this for images that don't convey meaningful information
   */
  decorative?: boolean;

  /** Fallback element if image fails to load */
  fallback?: React.ReactNode;
}

/**
 * AccessibleImage - WCAG 2.1 AA compliant image component
 *
 * Features:
 * - Mandatory alt text (compile-time enforcement)
 * - Decorative image support (alt="")
 * - Fallback for failed image loads
 * - Lazy loading support
 *
 * @example
 * // Meaningful image
 * <AccessibleImage
 *   src="/user-avatar.jpg"
 *   alt="Jane Doe, Software Engineer"
 * />
 *
 * @example
 * // Decorative image
 * <AccessibleImage
 *   src="/decorative-pattern.svg"
 *   alt=""
 *   decorative
 * />
 *
 * @example
 * // With fallback
 * <AccessibleImage
 *   src="/profile.jpg"
 *   alt="User profile"
 *   fallback={<div className="bg-gray-200">Failed to load</div>}
 * />
 */
export const AccessibleImage: React.FC<AccessibleImageProps> = ({
  alt,
  decorative = false,
  fallback,
  onError,
  ...props
}) => {
  const [hasError, setHasError] = useState(false);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setHasError(true);
    onError?.(e);
  };

  if (hasError && fallback) {
    return <>{fallback}</>;
  }

  // Enforce empty alt for decorative images
  const finalAlt = decorative ? '' : alt;

  // Warn if decorative flag doesn't match alt text
  if (process.env.NODE_ENV === 'development') {
    if (decorative && alt !== '') {
      console.warn(
        'AccessibleImage: decorative={true} but alt text is not empty. Alt will be set to "".'
      );
    }
    if (!decorative && alt === '') {
      console.warn(
        'AccessibleImage: alt is empty but decorative={false}. Set decorative={true} for decorative images.'
      );
    }
  }

  return (
    <img
      alt={finalAlt}
      onError={handleError}
      loading={props.loading || 'lazy'}
      {...props}
    />
  );
};

AccessibleImage.displayName = 'AccessibleImage';
