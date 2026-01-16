#!/usr/bin/env node

/**
 * PWA Icon Generator Script
 *
 * Generates all required PNG icons from the source SVG file
 * for Progressive Web App installation.
 *
 * Usage: node scripts/generate-pwa-icons.js
 *
 * Requirements: npm install sharp
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes required by the PWA manifest
const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384, 512];

// Paths
const SOURCE_SVG = path.join(__dirname, '..', 'public', 'icon-source.svg');
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons');

// Colors for fallback (if sharp is not available)
const BRAND_COLOR = '#6366f1';

async function generateIcons() {
  console.log('🎨 FineFlow PWA Icon Generator\n');

  // Check if sharp is installed
  let sharp;
  try {
    const sharpModule = await import('sharp');
    sharp = sharpModule.default;
    console.log('✅ Sharp library detected\n');
  } catch (error) {
    console.error('❌ Sharp library not found!');
    console.error('📦 Please install it by running: npm install sharp --save-dev\n');
    process.exit(1);
  }

  // Check if source SVG exists
  if (!fs.existsSync(SOURCE_SVG)) {
    console.error(`❌ Source SVG not found at: ${SOURCE_SVG}`);
    console.error('💡 Make sure icon-source.svg exists in the public directory\n');
    process.exit(1);
  }

  // Create icons directory if it doesn't exist
  if (!fs.existsSync(ICONS_DIR)) {
    fs.mkdirSync(ICONS_DIR, { recursive: true });
    console.log(`📁 Created directory: ${ICONS_DIR}\n`);
  }

  console.log('🔄 Generating PNG icons from SVG...\n');

  // Generate each icon size
  for (const size of ICON_SIZES) {
    const outputPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);

    try {
      await sharp(SOURCE_SVG)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({
          compressionLevel: 9,
          palette: true
        })
        .toFile(outputPath);

      const stats = fs.statSync(outputPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`  ✅ icon-${size}x${size}.png (${sizeKB} KB)`);
    } catch (error) {
      console.error(`  ❌ Failed to generate icon-${size}x${size}.png`);
      console.error(`     Error: ${error.message}`);
    }
  }

  console.log('\n✨ Icon generation complete!');
  console.log(`📍 Icons saved to: ${ICONS_DIR}`);

  // Generate verification report
  generateReport();
}

function generateReport() {
  console.log('\n📊 Verification Report:\n');

  let allPresent = true;
  let totalSize = 0;

  ICON_SIZES.forEach(size => {
    const iconPath = path.join(ICONS_DIR, `icon-${size}x${size}.png`);

    if (fs.existsSync(iconPath)) {
      const stats = fs.statSync(iconPath);
      const sizeKB = (stats.size / 1024).toFixed(2);
      totalSize += stats.size;
      console.log(`  ✅ ${size}x${size} - ${sizeKB} KB`);
    } else {
      console.log(`  ❌ ${size}x${size} - MISSING`);
      allPresent = false;
    }
  });

  const totalSizeKB = (totalSize / 1024).toFixed(2);
  console.log(`\n📦 Total size: ${totalSizeKB} KB (${ICON_SIZES.length} icons)`);

  if (allPresent) {
    console.log('\n✅ All PWA icons generated successfully!');
    console.log('🚀 Your app is ready for PWA installation');
    console.log('\n💡 Next steps:');
    console.log('   1. Test PWA installation on mobile device');
    console.log('   2. Run Lighthouse audit to verify PWA score');
    console.log('   3. Check manifest.json is properly served');
  } else {
    console.log('\n⚠️  Some icons are missing. Please check the errors above.');
  }
}

// Run the generator
generateIcons().catch(error => {
  console.error('\n❌ Error generating icons:', error);
  process.exit(1);
});
