# status indicator refactor

## what changed

### previous implementation (removed)

- **StatusBanner component** - full-width banner between nav and content
- took up vertical space (height: ~60px with padding)
- displayed text messages and countdown timers
- **issue:** too much visual real estate for a passive indicator

### new implementation

- **StatusIndicator component** - minimal dot in header
- **size:** 8px diameter (w-2 h-2 in tailwind)
- **position:** far right of header, next to hit counter
- **zero layout impact:** fits within existing header height

## visual states

### green dot (pulsing) - healthy

- **status:** `idle` or `polling`
- **color:** emerald-500 (#10b981)
- **animation:** `animate-pulse`
- **tooltip:** "Healthy"

### red dot (solid) - error

- **status:** `error`
- **color:** red-500 (#ef4444)
- **animation:** none (solid)
- **tooltip:** displays error message on hover

### yellow dot (pulsing) - rate limited

- **status:** `ratelimited`
- **color:** amber-500 (#f59e0b)
- **animation:** `animate-pulse`
- **tooltip:** displays rate limit message on hover

## implementation details

### StatusIndicator.tsx

```typescript
// minimal visual cue - just colored dot
// green = healthy, red = error, yellow = rate-limited
// uses title attribute for tooltip on hover
```

**key features:**

- reactive to `chrome.storage.onChanged`
- no text, no countdown timer
- tooltip provides context on hover
- same storage key (`STORAGE_KEYS.SYSTEM_STATUS`)

### App.tsx header structure

```tsx
<header className="flex items-center justify-between...">
  <div><!-- logo + name --></div>
  <div className="flex items-center gap-2">
    <div><!-- hit counter --></div>
    <StatusIndicator /> {/* ← new placement */}
  </div>
</header>
```

**spacing:**

- `gap-2` (8px) between hit counter and status dot
- maintains consistent vertical alignment
- no height change to header

## files modified

- **created:** `src/ui/components/StatusIndicator.tsx` (new minimal component)
- **modified:** `src/sidepanel/App.tsx` (header integration, removed StatusBanner)
- **deprecated:** `src/ui/components/StatusBanner.tsx` (no longer used, can be deleted)

## testing

### debug console (same as before)

```javascript
// open side panel devtools console
await window.debugSystemStatus.setError('network timeout');
// observe: red dot appears in header (far right)

await window.debugSystemStatus.setRateLimited(60);
// observe: yellow dot appears in header (pulsing)

await window.debugSystemStatus.setIdle();
// observe: green dot appears in header (pulsing)
```

### hover test

1. trigger error state
2. hover over red dot
3. **expected:** tooltip shows error message

## build verification

```powershell
npm run build
```

✅ **passed** - build completed in 7.51s

## visual comparison

**before:** full banner occupying ~60px vertical space
**after:** 8px dot integrated into existing header

![Header with Status Indicator](C:/Users/MODiE/.gemini/antigravity/brain/80e02a5d-0013-426e-944a-652599c3c412/status_indicator_header_1765041490125.png)

## commit message

```
refactor(ui): replace status banner with minimal header indicator

removes full-width StatusBanner in favor of 8px colored dot in header.
maintains same reactive logic (idle/polling/error/ratelimited states).
zero layout impact - fits within existing header height at far right.
tooltips provide context on hover without consuming screen space.
```
