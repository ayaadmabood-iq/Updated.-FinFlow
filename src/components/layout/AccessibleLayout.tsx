import React from 'react';

export interface AccessibleLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  sidebar?: React.ReactNode;
  footer?: React.ReactNode;
}

/**
 * Accessible layout with proper landmarks and skip links
 */
export function AccessibleLayout({
  children,
  header,
  sidebar,
  footer,
}: AccessibleLayoutProps) {
  return (
    <>
      {/* Skip Links - Hidden but accessible to screen readers and keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to main content
      </a>

      <a
        href="#navigation"
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-40 focus:z-50 focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg"
      >
        Skip to navigation
      </a>

      <div className="min-h-screen flex flex-col">
        {/* Header */}
        {header && (
          <header
            role="banner"
            className="sticky top-0 z-40 bg-white border-b"
          >
            {header}
          </header>
        )}

        <div className="flex flex-1">
          {/* Sidebar Navigation */}
          {sidebar && (
            <aside
              id="navigation"
              role="navigation"
              aria-label="Main navigation"
              className="w-64 bg-gray-50 border-r"
            >
              {sidebar}
            </aside>
          )}

          {/* Main Content */}
          <main
            id="main-content"
            role="main"
            aria-label="Main content"
            className="flex-1 p-6"
            tabIndex={-1}
          >
            {children}
          </main>
        </div>

        {/* Footer */}
        {footer && (
          <footer
            role="contentinfo"
            className="bg-gray-50 border-t py-6"
          >
            {footer}
          </footer>
        )}
      </div>
    </>
  );
}
