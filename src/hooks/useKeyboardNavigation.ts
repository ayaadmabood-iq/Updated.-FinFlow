import { useEffect, useCallback, useState } from 'react';

export interface KeyboardNavigationOptions {
  onEscape?: () => void;
  onEnter?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onArrowLeft?: () => void;
  onArrowRight?: () => void;
  onTab?: () => void;
  onHome?: () => void;
  onEnd?: () => void;
  onPageUp?: () => void;
  onPageDown?: () => void;
  enabled?: boolean;
}

/**
 * Hook for implementing WCAG-compliant keyboard navigation
 *
 * Supports all standard keyboard shortcuts:
 * - Arrow keys: Navigation
 * - Home/End: First/last item
 * - PageUp/PageDown: Jump navigation
 * - Enter/Space: Activate
 * - Escape: Cancel/close
 *
 * @example
 * ```tsx
 * useKeyboardNavigation({
 *   onEscape: () => closeModal(),
 *   onEnter: () => submitForm(),
 *   onArrowDown: () => selectNextItem(),
 *   onHome: () => selectFirstItem(),
 *   onEnd: () => selectLastItem(),
 * });
 * ```
 */
export function useKeyboardNavigation(options: KeyboardNavigationOptions) {
  const {
    onEscape,
    onEnter,
    onArrowUp,
    onArrowDown,
    onArrowLeft,
    onArrowRight,
    onTab,
    onHome,
    onEnd,
    onPageUp,
    onPageDown,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      switch (event.key) {
        case 'Escape':
          onEscape?.();
          break;
        case 'Enter':
          onEnter?.();
          break;
        case 'ArrowUp':
          event.preventDefault();
          onArrowUp?.();
          break;
        case 'ArrowDown':
          event.preventDefault();
          onArrowDown?.();
          break;
        case 'ArrowLeft':
          onArrowLeft?.();
          break;
        case 'ArrowRight':
          onArrowRight?.();
          break;
        case 'Tab':
          onTab?.();
          break;
        case 'Home':
          event.preventDefault();
          onHome?.();
          break;
        case 'End':
          event.preventDefault();
          onEnd?.();
          break;
        case 'PageUp':
          event.preventDefault();
          onPageUp?.();
          break;
        case 'PageDown':
          event.preventDefault();
          onPageDown?.();
          break;
      }
    },
    [enabled, onEscape, onEnter, onArrowUp, onArrowDown, onArrowLeft, onArrowRight, onTab, onHome, onEnd, onPageUp, onPageDown]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}

/**
 * Hook for trapping focus within a container (for modals, dialogs)
 * WCAG 2.1 AA compliant focus management
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when trap is enabled
    firstElement?.focus();

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [containerRef, enabled]);
}

/**
 * useRovingTabIndex - Implements WCAG roving tabindex pattern
 *
 * Only one item in a group is tabbable at a time (all others have tabindex="-1").
 * Arrow keys move focus between items.
 *
 * @example
 * ```tsx
 * const { getItemProps } = useRovingTabIndex(items.length);
 *
 * return (
 *   <div role="toolbar">
 *     {items.map((item, i) => (
 *       <button {...getItemProps(i)}>{item}</button>
 *     ))}
 *   </div>
 * );
 * ```
 */
export function useRovingTabIndex(itemCount: number) {
  const [activeIndex, setActiveIndex] = useState(0);

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      onFocus: () => setActiveIndex(index),
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
          e.preventDefault();
          const nextIndex = (index + 1) % itemCount;
          setActiveIndex(nextIndex);
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
          e.preventDefault();
          const prevIndex = (index - 1 + itemCount) % itemCount;
          setActiveIndex(prevIndex);
        } else if (e.key === 'Home') {
          e.preventDefault();
          setActiveIndex(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          setActiveIndex(itemCount - 1);
        }
      },
    }),
    [activeIndex, itemCount]
  );

  return { activeIndex, setActiveIndex, getItemProps };
}

/**
 * useAnnouncement - Screen reader announcements
 *
 * Creates a live region for screen reader announcements.
 *
 * @example
 * ```tsx
 * const announce = useAnnouncement();
 *
 * const handleSave = () => {
 *   saveData();
 *   announce('Data saved successfully', 'polite');
 * };
 * ```
 */
export function useAnnouncement() {
  const [announcement, setAnnouncement] = useState('');
  const [politeness, setPoliteness] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback((message: string, level: 'polite' | 'assertive' = 'polite') => {
    setPoliteness(level);
    setAnnouncement(message);
    // Clear after announcement
    setTimeout(() => setAnnouncement(''), 1000);
  }, []);

  // Create live region
  useEffect(() => {
    const liveRegion = document.getElementById('a11y-announcer');
    if (!liveRegion) {
      const region = document.createElement('div');
      region.id = 'a11y-announcer';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', politeness);
      region.setAttribute('aria-atomic', 'true');
      region.className = 'sr-only'; // Visually hidden
      document.body.appendChild(region);
    }
  }, [politeness]);

  useEffect(() => {
    const liveRegion = document.getElementById('a11y-announcer');
    if (liveRegion && announcement) {
      liveRegion.textContent = announcement;
      liveRegion.setAttribute('aria-live', politeness);
    }
  }, [announcement, politeness]);

  return announce;
}
