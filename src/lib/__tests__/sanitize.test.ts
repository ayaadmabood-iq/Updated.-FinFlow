import { describe, it, expect } from 'vitest';
import {
  sanitizeHTML,
  sanitizeMarkdown,
  sanitizeSearchSnippet,
  sanitizeChartStyles,
  stripHTML,
  escapeHTML,
} from '../sanitize';

describe('Sanitize Utilities', () => {
  describe('sanitizeHTML', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
    });

    it('should remove script tags', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).not.toContain('alert');
    });

    it('should remove event handlers', () => {
      const input = '<img src="x" onerror="alert(1)" />';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onerror');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<iframe>');
    });

    it('should handle empty input', () => {
      expect(sanitizeHTML('')).toBe('');
    });
  });

  describe('sanitizeMarkdown', () => {
    it('should sanitize HTML in markdown', () => {
      const input = '<script>alert(1)</script>Hello';
      const result = sanitizeMarkdown(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should convert newlines to br tags', () => {
      const input = 'Line 1\nLine 2';
      const result = sanitizeMarkdown(input);
      expect(result).toContain('<br/>');
    });

    it('should handle empty input', () => {
      expect(sanitizeMarkdown('')).toBe('');
    });
  });

  describe('sanitizeSearchSnippet', () => {
    it('should allow mark tags', () => {
      const input = 'This is <mark>highlighted</mark>';
      const result = sanitizeSearchSnippet(input);
      expect(result).toContain('<mark>');
    });

    it('should remove script tags', () => {
      const input = '<script>alert(1)</script>text';
      const result = sanitizeSearchSnippet(input);
      expect(result).not.toContain('<script>');
    });

    it('should handle empty input', () => {
      expect(sanitizeSearchSnippet('')).toBe('');
    });
  });

  describe('sanitizeChartStyles', () => {
    it('should allow CSS color variables', () => {
      const input = '  --color-primary: #ff0000;';
      const result = sanitizeChartStyles(input);
      expect(result).toContain('--color-primary');
    });

    it('should allow hex colors', () => {
      const input = '  --color-test: #aabbcc;';
      const result = sanitizeChartStyles(input);
      expect(result).toContain('#aabbcc');
    });

    it('should allow rgb colors', () => {
      const input = '  --color-test: rgb(255, 128, 0);';
      const result = sanitizeChartStyles(input);
      expect(result).toContain('rgb(255, 128, 0)');
    });

    it('should filter dangerous CSS', () => {
      const input = '  background: url("javascript:alert(1)");';
      const result = sanitizeChartStyles(input);
      expect(result).not.toContain('javascript');
    });

    it('should handle empty input', () => {
      expect(sanitizeChartStyles('')).toBe('');
    });
  });

  describe('stripHTML', () => {
    it('should remove all HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      const result = stripHTML(input);
      expect(result).toBe('Hello world');
    });

    it('should trim whitespace', () => {
      const input = '  <p>  Hello  </p>  ';
      const result = stripHTML(input);
      expect(result).toBe('Hello');
    });

    it('should handle empty input', () => {
      expect(stripHTML('')).toBe('');
    });
  });

  describe('escapeHTML', () => {
    it('should escape ampersand', () => {
      expect(escapeHTML('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    it('should escape less than', () => {
      expect(escapeHTML('1 < 2')).toBe('1 &lt; 2');
    });

    it('should escape greater than', () => {
      expect(escapeHTML('2 > 1')).toBe('2 &gt; 1');
    });

    it('should escape quotes', () => {
      expect(escapeHTML('Say "Hello"')).toBe('Say &quot;Hello&quot;');
    });

    it('should handle empty input', () => {
      expect(escapeHTML('')).toBe('');
    });
  });
});
