import React, { useState } from 'react';
import { Menu, X, Home, FileText, Settings, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ResponsiveNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { icon: Home, label: 'Dashboard', href: '/dashboard' },
    { icon: FileText, label: 'Documents', href: '/documents' },
    { icon: Settings, label: 'Settings', href: '/settings' },
    { icon: User, label: 'Profile', href: '/profile' },
  ];

  return (
    <>
      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6" aria-label="Main navigation">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <item.icon className="h-5 w-5" aria-hidden="true" />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>

      {/* Mobile Menu Button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="md:hidden min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
        aria-label="Toggle mobile menu"
        aria-expanded={mobileMenuOpen}
      >
        {mobileMenuOpen ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <Menu className="h-6 w-6" aria-hidden="true" />
        )}
      </button>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden animate-fade-in"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Menu Panel */}
          <nav
            className="fixed top-0 right-0 bottom-0 w-64 bg-white dark:bg-gray-900 shadow-xl z-50 md:hidden animate-slide-in-right"
            aria-label="Mobile navigation"
          >
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="font-semibold text-lg">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[44px] min-w-[44px] p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:scale-95 transition-all"
                aria-label="Close mobile menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {navItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 min-h-[48px] px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <item.icon className="h-5 w-5" aria-hidden="true" />
                  <span className="font-medium">{item.label}</span>
                </a>
              ))}
            </div>
          </nav>
        </>
      )}
    </>
  );
}
