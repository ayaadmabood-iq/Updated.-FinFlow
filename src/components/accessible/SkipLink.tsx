// ============= Skip Link Component =============
// WCAG 2.1 AA compliant skip navigation link

import React from 'react';

export interface SkipLinkProps {
  /** Target element ID to skip to */
  targetId: string;

  /** Link text */
  children: React.ReactNode;

  /** Additional CSS classes */
  className?: string;
}

/**
 * SkipLink - Allows keyboard users to bypass navigation
 *
 * Skip links are visible only on keyboard focus and allow users to
 * jump directly to main content, bypassing repetitive navigation.
 *
 * WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks) - Level A
 *
 * @example
 * ```tsx
 * // At the top of your layout
 * <SkipLink targetId="main-content">
 *   Skip to main content
 * </SkipLink>
 *
 * // Later in the layout
 * <main id="main-content">
 *   {children}
 * </main>
 * ```
 */
export const SkipLink: React.FC<SkipLinkProps> = ({
  targetId,
  children,
  className = '',
}) => {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: 'smooth' });

      // Ensure focus is visible
      if (!target.hasAttribute('tabindex')) {
        target.setAttribute('tabindex', '-1');
      }
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={`
        sr-only
        focus:not-sr-only
        focus:absolute
        focus:top-4
        focus:left-4
        focus:z-50
        focus:px-4
        focus:py-2
        focus:bg-blue-600
        focus:text-white
        focus:rounded
        focus:outline-none
        focus:ring-2
        focus:ring-blue-500
        focus:ring-offset-2
        ${className}
      `}
    >
      {children}
    </a>
  );
};

/**
 * SkipLinks - Container for multiple skip links
 *
 * Provides common skip links for typical page layouts.
 *
 * @example
 * ```tsx
 * <SkipLinks />
 *
 * // With custom links
 * <SkipLinks>
 *   <SkipLink targetId="search">Skip to search</SkipLink>
 * </SkipLinks>
 * ```
 */
export const SkipLinks: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  return (
    <div className="skip-links">
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <SkipLink targetId="navigation">Skip to navigation</SkipLink>
      {children}
    </div>
  );
};
