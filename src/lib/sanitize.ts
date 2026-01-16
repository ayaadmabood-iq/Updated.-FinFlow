// ============= XSS Prevention Utilities =============
// Centralized sanitization for HTML content rendering

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content for safe rendering
 * Use this instead of dangerouslySetInnerHTML
 */
export function sanitizeHTML(html: string): string {
  if (typeof window === 'undefined') {
    // Server-side or SSR fallback - strip all HTML
    return html.replace(/<[^>]*>/g, '');
  }
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
      'a', 'mark', 'span', 'div',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'hr', 'sub', 'sup'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class', 'id', 'style'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}

/**
 * Sanitize markdown that's been converted to HTML
 * Strips all HTML and converts newlines to <br/>
 */
export function sanitizeMarkdown(markdown: string): string {
  if (!markdown) return '';
  
  // First sanitize any existing HTML
  const sanitized = sanitizeHTML(markdown);
  
  // Convert newlines to <br/> for display
  return sanitized.replace(/\n/g, '<br/>');
}

/**
 * Sanitize search snippet with highlighted matches
 * Preserves only <mark> tags for highlighting
 */
export function sanitizeSearchSnippet(snippet: string): string {
  if (!snippet) return '';
  
  return DOMPurify.sanitize(snippet, {
    ALLOWED_TAGS: ['mark', 'span'],
    ALLOWED_ATTR: ['class'],
    FORBID_TAGS: ['script', 'style', 'iframe'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick'],
  });
}

/**
 * Create safe inline styles for charts
 * Only allows CSS color-related properties
 */
export function sanitizeChartStyles(styleContent: string): string {
  if (!styleContent) return '';
  
  // Only allow CSS variable declarations for colors
  // Pattern: --color-{key}: {value};
  const lines = styleContent.split('\n');
  const safeLines: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Allow CSS selectors and brackets
    if (trimmed.startsWith('[data-chart=') || 
        trimmed === '{' || 
        trimmed === '}' ||
        trimmed.startsWith('.') ||
        trimmed === '') {
      safeLines.push(line);
      continue;
    }
    
    // Only allow --color-* variable declarations
    if (/^\s*--color-[\w-]+:\s*[^;]+;?\s*$/.test(trimmed)) {
      // Validate the color value (hex, hsl, rgb, or named color)
      const colorMatch = trimmed.match(/--color-[\w-]+:\s*([^;]+)/);
      if (colorMatch) {
        const colorValue = colorMatch[1].trim();
        if (isValidCSSColor(colorValue)) {
          safeLines.push(line);
        }
      }
    }
  }
  
  return safeLines.join('\n');
}

/**
 * Check if a string is a valid CSS color value
 */
function isValidCSSColor(value: string): boolean {
  // Hex colors
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return true;
  
  // RGB/RGBA
  if (/^rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*(,\s*[\d.]+\s*)?\)$/.test(value)) return true;
  
  // HSL/HSLA
  if (/^hsla?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?\s*(,\s*[\d.]+\s*)?\)$/.test(value)) return true;
  
  // HSL with spaces (modern syntax)
  if (/^hsl\(\s*[\d.]+\s+[\d.]+%?\s+[\d.]+%?\s*(\/\s*[\d.]+%?\s*)?\)$/.test(value)) return true;
  
  // CSS variable reference
  if (/^var\(--[\w-]+\)$/.test(value)) return true;
  
  // Named colors (common subset)
  const namedColors = [
    'transparent', 'currentColor', 'inherit', 'initial', 'unset',
    'black', 'white', 'red', 'green', 'blue', 'yellow', 'orange', 'purple',
    'gray', 'grey', 'pink', 'cyan', 'magenta'
  ];
  if (namedColors.includes(value.toLowerCase())) return true;
  
  return false;
}

/**
 * Strip all HTML tags from content
 * Use when you need plain text only
 */
export function stripHTML(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Escape HTML entities
 * Use for text that should not be parsed as HTML
 */
export function escapeHTML(text: string): string {
  if (!text) return '';
  
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };
  
  return text.replace(/[&<>"'/]/g, (char) => entities[char] || char);
}
