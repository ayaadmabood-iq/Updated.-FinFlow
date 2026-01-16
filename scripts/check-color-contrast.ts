/**
 * Check color contrast ratios for WCAG 2.1 AA compliance
 *
 * WCAG 2.1 AA Requirements:
 * - Normal text: 4.5:1 minimum
 * - Large text (18pt+): 3:1 minimum
 * - UI components: 3:1 minimum
 */

interface ColorPair {
  foreground: string;
  background: string;
  usage: string;
  decorativeOnly?: boolean;
}

const colorPairs: ColorPair[] = [
  // Primary colors
  { foreground: '#FFFFFF', background: '#2563EB', usage: 'Primary button text' },
  { foreground: '#1F2937', background: '#FFFFFF', usage: 'Body text' },
  { foreground: '#6B7280', background: '#FFFFFF', usage: 'Secondary text' },

  // Status colors (FIXED)
  { foreground: '#FFFFFF', background: '#DC2626', usage: 'Error button' },
  { foreground: '#FFFFFF', background: '#15803D', usage: 'Success button (FIXED)' },
  { foreground: '#FFFFFF', background: '#B45309', usage: 'Warning button (FIXED)' },

  // Gray scale
  { foreground: '#FFFFFF', background: '#4B5563', usage: 'Gray button' },
  { foreground: '#374151', background: '#F3F4F6', usage: 'Gray background text' },

  // Links and interactive elements
  { foreground: '#2563EB', background: '#FFFFFF', usage: 'Link text' },
  { foreground: '#1D4ED8', background: '#FFFFFF', usage: 'Link hover' },

  // UI elements (decorative only - not for interactive text)
  { foreground: '#E5E7EB', background: '#FFFFFF', usage: 'Border (decorative only)', decorativeOnly: true },
  { foreground: '#6B7280', background: '#FFFFFF', usage: 'Placeholder text (FIXED)' },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 0, g: 0, b: 0 };
}

function getLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function getContrastRatio(color1: string, color2: string): number {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  const lum1 = getLuminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = getLuminance(rgb2.r, rgb2.g, rgb2.b);

  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (lighter + 0.05) / (darker + 0.05);
}

function checkContrast() {
  console.log('🎨 Checking Color Contrast Ratios\n');
  console.log('WCAG 2.1 AA Requirements:');
  console.log('- Normal text: 4.5:1 minimum');
  console.log('- Large text: 3:1 minimum');
  console.log('- UI components: 3:1 minimum\n');

  let passed = 0;
  let failed = 0;

  colorPairs.forEach((pair) => {
    const ratio = getContrastRatio(pair.foreground, pair.background);
    const meetsAA = ratio >= 4.5;
    const meetsAALarge = ratio >= 3.0;

    // Skip contrast check for decorative elements
    if (pair.decorativeOnly) {
      console.log(`⚪ SKIP - ${pair.usage} (decorative, no contrast requirement)`);
      console.log(`  Foreground: ${pair.foreground}`);
      console.log(`  Background: ${pair.background}`);
      console.log(`  Ratio: ${ratio.toFixed(2)}:1`);
      console.log('');
      return;
    }

    const status = meetsAA ? '✅ PASS' : meetsAALarge ? '⚠️  LARGE TEXT ONLY' : '❌ FAIL';

    console.log(`${status} - ${pair.usage}`);
    console.log(`  Foreground: ${pair.foreground}`);
    console.log(`  Background: ${pair.background}`);
    console.log(`  Ratio: ${ratio.toFixed(2)}:1`);
    console.log('');

    if (meetsAA) {
      passed++;
    } else {
      failed++;
    }
  });

  console.log('📊 Summary:');
  console.log(`Total: ${colorPairs.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some color combinations do not meet WCAG 2.1 AA standards');
    process.exit(1);
  } else {
    console.log('\n✅ All color combinations meet WCAG 2.1 AA standards');
  }
}

checkContrast();
