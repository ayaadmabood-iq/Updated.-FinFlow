import React from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface RTLWrapperProps {
  children: React.ReactNode;
  className?: string;
  forceDirection?: 'ltr' | 'rtl' | 'auto';
}

/**
 * RTLWrapper - Handles bidirectional text and RTL layout
 * 
 * This component wraps content that may contain mixed RTL/LTR text
 * and applies appropriate CSS classes for proper rendering.
 */
export function RTLWrapper({ 
  children, 
  className,
  forceDirection,
}: RTLWrapperProps) {
  const { i18n } = useTranslation();
  const isRTL = forceDirection === 'rtl' || (forceDirection !== 'ltr' && i18n.language === 'ar');
  
  return (
    <div 
      className={cn(
        'rtl-wrapper',
        isRTL && 'rtl-content',
        className
      )}
      dir={forceDirection || (isRTL ? 'rtl' : 'ltr')}
    >
      {children}
    </div>
  );
}

interface BiDiTextProps {
  children: React.ReactNode;
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  className?: string;
  detectDirection?: boolean;
}

/**
 * BiDiText - Renders bidirectional text with proper isolation
 * 
 * Use this for text that may contain mixed RTL/LTR content,
 * like Arabic text with English words or numbers.
 */
export function BiDiText({ 
  children, 
  as: Component = 'span',
  className,
  detectDirection = true,
}: BiDiTextProps) {
  const textContent = typeof children === 'string' ? children : '';
  
  // Detect if text contains RTL characters
  const hasRTL = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(textContent);
  const hasLTR = /[a-zA-Z]/.test(textContent);
  const isMixed = hasRTL && hasLTR;

  return (
    <Component 
      className={cn(
        'bidi-text',
        isMixed && 'bidi-mixed',
        className
      )}
      dir={detectDirection ? (hasRTL && !hasLTR ? 'rtl' : 'auto') : undefined}
      style={{ unicodeBidi: isMixed ? 'isolate' : undefined }}
    >
      {children}
    </Component>
  );
}

interface NumberDisplayProps {
  value: number;
  format?: 'decimal' | 'percent' | 'currency';
  currency?: string;
  locale?: string;
  className?: string;
}

/**
 * NumberDisplay - Renders numbers with proper formatting for Arabic/English
 * 
 * Numbers are always displayed LTR but formatted according to locale.
 */
export function NumberDisplay({
  value,
  format = 'decimal',
  currency = 'SAR',
  locale,
  className,
}: NumberDisplayProps) {
  const { i18n } = useTranslation();
  const displayLocale = locale || (i18n.language === 'ar' ? 'ar-SA' : 'en-US');

  const formattedValue = React.useMemo(() => {
    switch (format) {
      case 'percent':
        return new Intl.NumberFormat(displayLocale, { 
          style: 'percent',
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
        }).format(value / 100);
      case 'currency':
        return new Intl.NumberFormat(displayLocale, {
          style: 'currency',
          currency,
        }).format(value);
      default:
        return new Intl.NumberFormat(displayLocale).format(value);
    }
  }, [value, format, currency, displayLocale]);

  // Always render numbers LTR for consistency
  return (
    <span className={cn('inline-block', className)} dir="ltr">
      {formattedValue}
    </span>
  );
}

interface DateDisplayProps {
  date: Date | string;
  format?: 'full' | 'long' | 'medium' | 'short';
  showHijri?: boolean;
  locale?: string;
  className?: string;
}

/**
 * DateDisplay - Renders dates with optional Hijri calendar support
 */
export function DateDisplay({
  date,
  format = 'medium',
  showHijri = false,
  locale,
  className,
}: DateDisplayProps) {
  const { i18n } = useTranslation();
  const displayLocale = locale || (i18n.language === 'ar' ? 'ar-SA' : 'en-US');
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const gregorianFormatted = React.useMemo(() => {
    const options: Intl.DateTimeFormatOptions = {
      dateStyle: format,
    };
    return new Intl.DateTimeFormat(displayLocale, options).format(dateObj);
  }, [dateObj, format, displayLocale]);

  const hijriFormatted = React.useMemo(() => {
    if (!showHijri) return null;
    const options: Intl.DateTimeFormatOptions = {
      calendar: 'islamic-umalqura',
      dateStyle: format,
    };
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', options).format(dateObj);
  }, [dateObj, format, showHijri]);

  return (
    <span className={cn('inline-block', className)}>
      {gregorianFormatted}
      {hijriFormatted && (
        <span className="text-muted-foreground text-sm ms-2" dir="rtl">
          ({hijriFormatted})
        </span>
      )}
    </span>
  );
}

// CSS styles for RTL support (add to index.css)
export const rtlStyles = `
/* RTL Layout Support */
.rtl-content {
  direction: rtl;
  text-align: right;
}

.rtl-content .flex {
  flex-direction: row-reverse;
}

.rtl-content .space-x-2 > :not([hidden]) ~ :not([hidden]) {
  --tw-space-x-reverse: 1;
}

.rtl-content .space-x-4 > :not([hidden]) ~ :not([hidden]) {
  --tw-space-x-reverse: 1;
}

/* BiDi Text Isolation */
.bidi-text {
  unicode-bidi: embed;
}

.bidi-mixed {
  unicode-bidi: isolate;
}

/* Chart RTL Support */
[dir="rtl"] .recharts-wrapper {
  direction: ltr;
}

[dir="rtl"] .recharts-legend-wrapper {
  direction: rtl;
}

/* Table RTL Support */
[dir="rtl"] table {
  direction: rtl;
}

[dir="rtl"] th,
[dir="rtl"] td {
  text-align: right;
}

[dir="rtl"] th:first-child,
[dir="rtl"] td:first-child {
  text-align: right;
  padding-right: 1rem;
  padding-left: 0.5rem;
}

[dir="rtl"] th:last-child,
[dir="rtl"] td:last-child {
  text-align: left;
  padding-left: 1rem;
  padding-right: 0.5rem;
}

/* Form RTL Support */
[dir="rtl"] input,
[dir="rtl"] textarea,
[dir="rtl"] select {
  text-align: right;
}

[dir="rtl"] input[type="number"] {
  text-align: left;
}

/* Icon Flip for RTL */
[dir="rtl"] .icon-flip {
  transform: scaleX(-1);
}

/* Proper margin/padding for RTL */
[dir="rtl"] .ml-2 { margin-left: 0; margin-right: 0.5rem; }
[dir="rtl"] .mr-2 { margin-right: 0; margin-left: 0.5rem; }
[dir="rtl"] .ml-4 { margin-left: 0; margin-right: 1rem; }
[dir="rtl"] .mr-4 { margin-right: 0; margin-left: 1rem; }
[dir="rtl"] .pl-2 { padding-left: 0; padding-right: 0.5rem; }
[dir="rtl"] .pr-2 { padding-right: 0; padding-left: 0.5rem; }
[dir="rtl"] .pl-4 { padding-left: 0; padding-right: 1rem; }
[dir="rtl"] .pr-4 { padding-right: 0; padding-left: 1rem; }
`;
