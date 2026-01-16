# Accessible Components Library

WCAG 2.1 AA compliant React components for building accessible user interfaces.

## Components

### AccessibleButton

Full-featured button component with keyboard navigation, screen reader support, and focus management.

```tsx
import { AccessibleButton } from '@/components/accessible';

// Icon-only button (requires aria-label)
<AccessibleButton aria-label="Close dialog" icon={<XIcon />} />

// Button with text and icon
<AccessibleButton icon={<SaveIcon />} iconPosition="left">
  Save Changes
</AccessibleButton>

// Loading state
<AccessibleButton isLoading variant="primary">
  Submitting...
</AccessibleButton>

// Different variants
<AccessibleButton variant="primary">Primary</AccessibleButton>
<AccessibleButton variant="secondary">Secondary</AccessibleButton>
<AccessibleButton variant="danger">Delete</AccessibleButton>
<AccessibleButton variant="ghost">Cancel</AccessibleButton>
```

**Features:**
- Mandatory aria-label for icon-only buttons
- Keyboard support (Enter, Space)
- Visible focus indicators
- Loading states with aria-busy
- Disabled state handling
- Multiple variants and sizes

---

### AccessibleInput

Form input with automatic label association, error handling, and screen reader support.

```tsx
import { AccessibleInput } from '@/components/accessible';

// Basic input
<AccessibleInput
  label="Email Address"
  type="email"
  required
/>

// With error and helper text
<AccessibleInput
  label="Password"
  type="password"
  error="Password must be at least 8 characters"
  helperText="Use a strong password"
  required
/>

// With icon
<AccessibleInput
  label="Search"
  icon={<SearchIcon />}
  iconPosition="left"
/>

// Visually hidden label (still accessible)
<AccessibleInput
  label="Search"
  hiddenLabel
/>
```

**Features:**
- Automatic label association with unique IDs
- Error state with aria-invalid and aria-describedby
- Helper text support
- Required field indicators
- Icon support
- Visually hidden label option

---

### AccessibleImage

Image component with mandatory alt text enforcement.

```tsx
import { AccessibleImage } from '@/components/accessible';

// Meaningful image
<AccessibleImage
  src="/user-avatar.jpg"
  alt="Jane Doe, Software Engineer"
/>

// Decorative image
<AccessibleImage
  src="/decorative-pattern.svg"
  alt=""
  decorative
/>

// With fallback
<AccessibleImage
  src="/photo.jpg"
  alt="Team photo"
  fallback={<div className="bg-gray-200">Failed to load image</div>}
/>
```

**Features:**
- Mandatory alt text (TypeScript enforced)
- Decorative image support (alt="")
- Fallback for failed loads
- Lazy loading by default
- Development warnings for misuse

---

### SkipLink & SkipLinks

Skip navigation links for keyboard users.

```tsx
import { SkipLink, SkipLinks } from '@/components/accessible';

// Single skip link
<SkipLink targetId="main-content">
  Skip to main content
</SkipLink>

// Multiple skip links
<SkipLinks>
  <SkipLink targetId="search">Skip to search</SkipLink>
</SkipLinks>

// Later in layout
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

**Features:**
- Visible only on keyboard focus
- Smooth scroll to target
- WCAG 2.4.1 Bypass Blocks (Level A)

---

### Semantic Landmarks

Semantic HTML5 landmark components with proper ARIA roles.

```tsx
import { Main, Navigation, Header, Footer, Aside, Section, Search } from '@/components/accessible';

// Page structure
<Header>
  <img src="/logo.svg" alt="Company Name" />
  <Navigation aria-label="Main navigation">
    <a href="/">Home</a>
    <a href="/about">About</a>
  </Navigation>
</Header>

<Main>
  <h1>Page Title</h1>

  <Section aria-labelledby="features-heading">
    <h2 id="features-heading">Features</h2>
    <p>Feature content...</p>
  </Section>

  <Aside aria-label="Related articles">
    <h2>You might also like</h2>
    <ul>...</ul>
  </Aside>
</Main>

<Footer>
  <p>&copy; 2026 Company Name</p>
  <Navigation aria-label="Footer navigation">
    <a href="/terms">Terms</a>
    <a href="/privacy">Privacy</a>
  </Navigation>
</Footer>

// Search landmark
<Search>
  <form role="search">
    <label htmlFor="search">Search</label>
    <input id="search" type="search" />
    <button type="submit">Search</button>
  </form>
</Search>
```

**Features:**
- Proper ARIA roles and landmarks
- Support for multiple navigation regions
- Semantic HTML5 elements
- Automatic landmark identification by assistive technologies

---

### Live Regions & Screen Reader Announcements

Components for announcing dynamic content changes to screen readers.

```tsx
import { LiveRegion, Alert, Status, VisuallyHidden, LoadingAnnouncer } from '@/components/accessible';

// Dynamic announcements
const [message, setMessage] = useState('');

const handleSave = () => {
  saveData();
  setMessage('Changes saved successfully');
};

<LiveRegion message={message} politeness="polite" />

// Alert (assertive, interrupts immediately)
<Alert>
  Form submission failed. Please try again.
</Alert>

// Status (polite, waits for pause)
<Status>
  3 items added to cart
</Status>

// Visually hidden text (for screen readers only)
<button>
  <TrashIcon />
  <VisuallyHidden>Delete item</VisuallyHidden>
</button>

// Loading announcer
const [loading, setLoading] = useState(false);

<LoadingAnnouncer
  isLoading={loading}
  loadingMessage="Loading data..."
  completedMessage="Data loaded successfully"
/>
```

**Features:**
- WCAG 4.1.3 Status Messages (Level AA)
- Polite/assertive announcement levels
- Automatic announcement timing
- Visually hidden text support

---

## Hooks

### useKeyboardNavigation

Enhanced keyboard navigation with WCAG support.

```tsx
import { useKeyboardNavigation, useFocusTrap, useRovingTabIndex, useAnnouncement } from '@/hooks/useKeyboardNavigation';

// Basic keyboard navigation
useKeyboardNavigation({
  onEscape: () => closeModal(),
  onEnter: () => submitForm(),
  onArrowDown: () => selectNextItem(),
  onArrowUp: () => selectPreviousItem(),
  onHome: () => selectFirstItem(),
  onEnd: () => selectLastItem(),
  onPageDown: () => jumpDown(),
  onPageUp: () => jumpUp(),
});

// Focus trap for modals
const dialogRef = useFocusTrap(isOpen);

<dialog ref={dialogRef} open={isOpen}>
  <h2>Dialog Title</h2>
  <button>Action</button>
  <button onClick={() => setIsOpen(false)}>Close</button>
</dialog>

// Roving tabindex pattern
const { getItemProps } = useRovingTabIndex(items.length);

<div role="toolbar">
  {items.map((item, i) => (
    <button {...getItemProps(i)}>{item}</button>
  ))}
</div>

// Screen reader announcements
const announce = useAnnouncement();

const handleSave = () => {
  saveData();
  announce('Data saved successfully', 'polite');
};
```

**Supported Keys:**
- Arrow keys: Navigation
- Home/End: First/last item
- PageUp/PageDown: Jump navigation
- Enter/Space: Activate
- Escape: Cancel/close

---

## Scripts

### audit-accessibility.ts

Comprehensive accessibility audit tool.

```bash
cd fineflow-foundation-main
npx tsx ../scripts/audit-accessibility.ts
```

**Checks:**
- Missing alt text on images
- Buttons without aria-labels
- Inputs without labels
- Clickable divs without roles
- Poor link text ("Click here", etc.)
- Heading hierarchy issues
- Low contrast colors
- Missing landmarks

**Output:**
- Console report with severity levels
- `accessibility-audit-report.json`
- Accessibility score (0-10)

---

### verify-color-contrast.ts

WCAG AA color contrast verification.

```bash
npx tsx scripts/verify-color-contrast.ts
```

**WCAG 2.1 AA Requirements:**
- Normal text (< 18pt): 4.5:1 minimum
- Large text (≥ 18pt): 3.0:1 minimum
- Large bold (≥ 14pt bold): 3.0:1 minimum

**Output:**
- Contrast ratios for common color combinations
- Failures and warnings
- `color-contrast-report.json`
- Recommended safe combinations

---

## Best Practices

### 1. Always Provide Alt Text

```tsx
// ✅ Good - descriptive alt text
<AccessibleImage src="/profile.jpg" alt="Jane Doe, CEO of Acme Corp" />

// ✅ Good - decorative image
<AccessibleImage src="/pattern.svg" alt="" decorative />

// ❌ Bad - missing alt text
<img src="/profile.jpg" />
```

### 2. Label All Form Inputs

```tsx
// ✅ Good - visible label
<AccessibleInput label="Email" type="email" />

// ✅ Good - visually hidden label
<AccessibleInput label="Search" hiddenLabel icon={<SearchIcon />} />

// ❌ Bad - no label
<input type="email" placeholder="Email" />
```

### 3. Icon Buttons Need Labels

```tsx
// ✅ Good - aria-label provided
<AccessibleButton aria-label="Close dialog" icon={<XIcon />} />

// ❌ Bad - icon button without label
<button><XIcon /></button>
```

### 4. Use Semantic Landmarks

```tsx
// ✅ Good - semantic structure
<Header>
  <Navigation aria-label="Main">...</Navigation>
</Header>
<Main>
  <Section aria-labelledby="heading">...</Section>
</Main>
<Footer>...</Footer>

// ❌ Bad - div soup
<div className="header">
  <div className="nav">...</div>
</div>
<div className="content">...</div>
```

### 5. Announce Dynamic Changes

```tsx
// ✅ Good - announces to screen readers
const announce = useAnnouncement();
announce('Item added to cart', 'polite');

// ❌ Bad - silent update
setItems([...items, newItem]);
```

### 6. Color Contrast

```tsx
// ✅ Good - meets 4.5:1 ratio
<span className="text-gray-700">Normal text</span>

// ❌ Bad - fails contrast (2.54:1)
<span className="text-gray-400">Low contrast text</span>
```

---

## Testing

### Keyboard Testing

1. Tab through all interactive elements
2. Verify focus indicators are visible
3. Test Enter/Space activation
4. Test arrow key navigation
5. Ensure no keyboard traps (except modals)

### Screen Reader Testing

**Windows:**
- NVDA (free): https://www.nvaccess.org/
- JAWS (commercial): https://www.freedomscientific.com/

**macOS:**
- VoiceOver (built-in): Cmd + F5

**Test checklist:**
- All images have alt text
- All inputs have labels
- Headings are in proper order
- Landmarks are identified
- Dynamic changes are announced
- Error messages are announced

### Automated Testing

```bash
# Accessibility audit
npx tsx scripts/audit-accessibility.ts

# Color contrast verification
npx tsx scripts/verify-color-contrast.ts
```

**Browser extensions:**
- axe DevTools (recommended)
- WAVE
- Lighthouse (Chrome DevTools)

---

## WCAG 2.1 AA Compliance Checklist

### ✅ Perceivable

- ✅ Text alternatives for images
- ✅ Color contrast (4.5:1 minimum)
- ✅ Resize text to 200%
- ✅ Don't rely on color alone

### ✅ Operable

- ✅ Keyboard accessible
- ✅ Focus visible
- ✅ No keyboard traps
- ✅ Skip links
- ✅ Heading hierarchy

### ✅ Understandable

- ✅ Form labels
- ✅ Error messages
- ✅ Helper text
- ✅ Consistent navigation

### ✅ Robust

- ✅ Valid HTML/ARIA
- ✅ Assistive technology compatible
- ✅ Semantic HTML

---

## Resources

### Internal Documentation
- `ACCESSIBILITY_IMPLEMENTATION_SUMMARY.md` - Full implementation summary
- Component source files with JSDoc comments

### External Resources
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [a11y Project](https://www.a11yproject.com/)
- [WebAIM](https://webaim.org/)

---

**Last Updated**: 2026-01-15
**WCAG Level**: AA
**Accessibility Score**: 9.5/10 (target)
