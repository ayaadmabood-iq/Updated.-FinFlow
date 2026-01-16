# PWA Icons Documentation

This document describes the Progressive Web App (PWA) icons implementation for FineFlow.

## Overview

FineFlow now includes a complete set of PWA icons that enable proper installation on mobile devices and desktops. The icons feature FineFlow's brand identity with a document and AI spark design in the brand color (#6366f1).

## Generated Icons

All 8 required PWA icon sizes have been generated:

| Size | File | Purpose | File Size |
|------|------|---------|-----------|
| 72x72 | `icon-72x72.png` | Android Chrome | 1.60 KB |
| 96x96 | `icon-96x96.png` | Android Chrome, Shortcuts | 1.66 KB |
| 128x128 | `icon-128x128.png` | Android Chrome | 2.04 KB |
| 144x144 | `icon-144x144.png` | MS Tiles | 2.17 KB |
| 152x152 | `icon-152x152.png` | iOS Safari | 2.25 KB |
| 192x192 | `icon-192x192.png` | Android Chrome (Standard) | 2.56 KB |
| 384x384 | `icon-384x384.png` | Android Chrome (High-res) | 4.21 KB |
| 512x512 | `icon-512x512.png` | Android Chrome (Highest-res) | 5.53 KB |

**Total Size:** 22.03 KB (highly optimized)

## Icon Design

The FineFlow icon features:

- **Background:** Indigo gradient (#6366f1) matching brand color
- **Main Element:** White document with folded corner
- **AI Indicator:** Golden spark/star effect (#fbbf24)
- **Tech Accent:** AI chip icon showing intelligent processing
- **Document Lines:** Subtle content representation
- **Maskable:** 80% safe zone for proper display on all devices

## Files

### Source Files
- **`public/icon-source.svg`** - Master SVG source (512x512)
- **`scripts/generate-pwa-icons.js`** - Icon generation script

### Generated Files
- **`public/icons/icon-*x*.png`** - 8 PNG icons at various sizes

## Regenerating Icons

If you need to regenerate the icons (e.g., after design changes):

1. **Edit the source:** Modify `public/icon-source.svg`

2. **Run the generator:**
   ```bash
   npm run generate:icons
   ```

3. **Verify generation:**
   The script will automatically verify all icons were created and show:
   - File sizes
   - Total size
   - Verification report

## PWA Manifest Configuration

The icons are configured in `vite.config.ts`:

```typescript
manifest: {
  name: "FineFlow - AI Document Intelligence",
  short_name: "FineFlow",
  theme_color: "#6366f1",
  background_color: "#0f172a",
  icons: [
    // 8 icon configurations with "maskable any" purpose
  ]
}
```

## Maskable Icons

All icons are configured as `"maskable any"`:
- **Maskable:** Allows system to apply custom shapes (circle, squircle, etc.)
- **Safe Zone:** Content confined to 80% of canvas (allows 10% margin on each side)
- **Any:** Also works as regular icon without masking

## Testing PWA Installation

### Mobile (Android/iOS)

1. **Open app in mobile browser:**
   ```
   https://your-app-url.com
   ```

2. **Look for install prompt:**
   - Android: "Add to Home Screen" banner
   - iOS: Share → "Add to Home Screen"

3. **Verify icon appearance:**
   - Icon shows on home screen
   - Icon matches brand colors
   - Icon isn't distorted or cut off

### Desktop (Chrome/Edge)

1. **Open app in browser**

2. **Install via menu:**
   - Chrome: ⋮ → "Install FineFlow..."
   - Edge: ⋯ → "Apps" → "Install FineFlow"

3. **Verify:**
   - App appears in app drawer/start menu
   - Icon displays correctly
   - Standalone window opens

## Lighthouse Audit

Run Lighthouse PWA audit to verify:

```bash
# Using Chrome DevTools
1. Open DevTools (F12)
2. Go to "Lighthouse" tab
3. Select "Progressive Web App"
4. Click "Generate report"
```

**Expected Results:**
- ✅ Installable
- ✅ Provides a valid web app manifest
- ✅ Icons provided (all sizes)
- ✅ Maskable icons provided
- ✅ Theme color matches manifest

## Troubleshooting

### Icons not showing

**Problem:** PWA install works but icons don't appear

**Solutions:**
1. Clear browser cache and reload
2. Uninstall PWA and reinstall
3. Check manifest is served with correct MIME type
4. Verify icon files are accessible (check network tab)

### Icons distorted or cut off

**Problem:** Icons appear cropped or stretched

**Solutions:**
1. Regenerate icons from source SVG
2. Verify SVG has proper safe zone (80% content area)
3. Test "maskable" vs "any" purpose
4. Check icon dimensions are square

### Install prompt not appearing

**Problem:** No "Add to Home Screen" prompt

**Requirements:**
- ✅ HTTPS connection (or localhost)
- ✅ Valid manifest file
- ✅ Service worker registered
- ✅ Icons present in manifest
- ✅ start_url accessible
- ✅ User visited twice (on mobile)

## Browser Support

| Browser | Support | Notes |
|---------|---------|-------|
| Chrome (Android) | ✅ Full | All features supported |
| Safari (iOS) | ✅ Partial | Uses apple-touch-icon fallback |
| Edge | ✅ Full | Same as Chrome |
| Firefox | ✅ Partial | Basic install support |
| Samsung Internet | ✅ Full | Full PWA support |

## Icon Specifications

### Design Guidelines

1. **Keep it simple:** Icons should be recognizable at small sizes
2. **Use safe zone:** Keep important content in center 80%
3. **High contrast:** Ensure visibility on various backgrounds
4. **Brand consistency:** Use brand colors and style
5. **Vector source:** Always start with SVG for scalability

### Technical Requirements

- **Format:** PNG with transparency
- **Color depth:** 24-bit with alpha channel
- **Compression:** Level 9 (maximum)
- **Dimensions:** Square (1:1 aspect ratio)
- **File size:** Optimize for mobile (<10KB per icon ideal)

## Maintenance

### Regular Tasks

1. **Version updates:** Regenerate icons when branding changes
2. **Size optimization:** Run compression if icons grow too large
3. **Audit checks:** Run Lighthouse quarterly to verify PWA score
4. **Cross-platform testing:** Test on new device types/OS versions

### When to Regenerate

Regenerate icons when:
- Brand colors change
- Logo/icon design updates
- New icon sizes are required
- Platform guidelines change
- Icons appear outdated

## Dependencies

- **sharp:** PNG generation from SVG (production dependency)
- **vite-plugin-pwa:** PWA manifest and service worker generation

## Resources

- [Web.dev PWA Icons Guide](https://web.dev/maskable-icon/)
- [PWA Builder Icon Generator](https://www.pwabuilder.com/imageGenerator)
- [Maskable.app Editor](https://maskable.app/editor)
- [MDN Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

## Support

For issues with PWA icons:

1. Check this documentation
2. Run `npm run generate:icons` to regenerate
3. Verify files exist in `public/icons/`
4. Test with Lighthouse audit
5. Check browser console for manifest errors

---

**Last Updated:** 2026-01-15
**Icon Version:** 1.0
**Total Icons:** 8 sizes
**Total Size:** 22.03 KB
