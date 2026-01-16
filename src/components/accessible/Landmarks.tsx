// ============= Semantic Landmark Components =============
// WCAG 2.1 AA compliant landmark regions

import React from 'react';

export interface LandmarkProps {
  children: React.ReactNode;
  className?: string;
}

export interface NavigationProps extends LandmarkProps {
  /** Accessible label for navigation (required if multiple navs) */
  'aria-label'?: string;
}

/**
 * Main - Primary content landmark
 *
 * WCAG 2.1 Success Criterion 2.4.1 (Bypass Blocks)
 * There should only be ONE <main> element per page.
 *
 * @example
 * ```tsx
 * <Main>
 *   <h1>Page Title</h1>
 *   <p>Page content...</p>
 * </Main>
 * ```
 */
export const Main: React.FC<LandmarkProps> = ({ children, className = '' }) => {
  return (
    <main id="main-content" tabIndex={-1} className={className}>
      {children}
    </main>
  );
};

/**
 * Navigation - Navigation landmark
 *
 * Use aria-label to distinguish between multiple navigation regions.
 *
 * @example
 * ```tsx
 * <Navigation aria-label="Main navigation">
 *   <a href="/">Home</a>
 *   <a href="/about">About</a>
 * </Navigation>
 *
 * <Navigation aria-label="Footer navigation">
 *   <a href="/terms">Terms</a>
 *   <a href="/privacy">Privacy</a>
 * </Navigation>
 * ```
 */
export const Navigation: React.FC<NavigationProps> = ({
  children,
  className = '',
  'aria-label': ariaLabel,
}) => {
  return (
    <nav id="navigation" aria-label={ariaLabel} className={className}>
      {children}
    </nav>
  );
};

/**
 * Header - Banner landmark
 *
 * Contains site header/logo/branding.
 * Should appear at the beginning of the page.
 *
 * @example
 * ```tsx
 * <Header>
 *   <img src="/logo.svg" alt="Company Name" />
 *   <Navigation aria-label="Main">
 *     <a href="/">Home</a>
 *   </Navigation>
 * </Header>
 * ```
 */
export const Header: React.FC<LandmarkProps> = ({ children, className = '' }) => {
  return (
    <header role="banner" className={className}>
      {children}
    </header>
  );
};

/**
 * Footer - Contentinfo landmark
 *
 * Contains site footer information.
 * Should appear at the end of the page.
 *
 * @example
 * ```tsx
 * <Footer>
 *   <p>&copy; 2026 Company Name</p>
 *   <Navigation aria-label="Footer">
 *     <a href="/terms">Terms</a>
 *   </Navigation>
 * </Footer>
 * ```
 */
export const Footer: React.FC<LandmarkProps> = ({ children, className = '' }) => {
  return (
    <footer role="contentinfo" className={className}>
      {children}
    </footer>
  );
};

/**
 * Aside - Complementary landmark
 *
 * For content that is complementary to the main content.
 *
 * @example
 * ```tsx
 * <Main>
 *   <article>Main article</article>
 *   <Aside aria-label="Related articles">
 *     <h2>You might also like</h2>
 *     <ul>...</ul>
 *   </Aside>
 * </Main>
 * ```
 */
export const Aside: React.FC<NavigationProps> = ({
  children,
  className = '',
  'aria-label': ariaLabel,
}) => {
  return (
    <aside role="complementary" aria-label={ariaLabel} className={className}>
      {children}
    </aside>
  );
};

/**
 * Section - Generic section with accessible heading
 *
 * Use for distinct sections of content.
 * Should have an accessible heading.
 *
 * @example
 * ```tsx
 * <Section aria-labelledby="features-heading">
 *   <h2 id="features-heading">Features</h2>
 *   <p>Feature content...</p>
 * </Section>
 * ```
 */
export const Section: React.FC<LandmarkProps & { 'aria-labelledby'?: string }> = ({
  children,
  className = '',
  'aria-labelledby': ariaLabelledBy,
}) => {
  return (
    <section aria-labelledby={ariaLabelledBy} className={className}>
      {children}
    </section>
  );
};

/**
 * Search - Search landmark
 *
 * For search functionality.
 *
 * @example
 * ```tsx
 * <Search>
 *   <form role="search">
 *     <label htmlFor="search-input">Search</label>
 *     <input id="search-input" type="search" />
 *     <button type="submit">Search</button>
 *   </form>
 * </Search>
 * ```
 */
export const Search: React.FC<LandmarkProps> = ({ children, className = '' }) => {
  return (
    <div role="search" className={className}>
      {children}
    </div>
  );
};
