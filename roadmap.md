# Project Roadmap: Sxentrie (RedditHawk)

**Format:** Technical directives with completion status.
**Objective:** Chrome Extension (MV3). Real-time Reddit monitor.
**Design Standard:** Zinc/Void Monochromatic. Glassmorphism.
**Code Standard:** **Svelte 5** (Runes) via Vite. TypeScript. Max 300 lines/file.

---

## ⚠️ CRITICAL: API Strategy Change

### Original Plan (BYOK - Deprecated)

The original roadmap mandated "Bring Your Own Key" (BYOK) using `chrome.identity.launchWebAuthFlow` and Reddit OAuth2. This is **no longer viable** due to:

1. **Reddit API Lockdown (2024-2025):** Self-service API key creation is effectively blocked. Applications are rejected without recourse.
2. **Manual Approval Barrier:** Even "Installed App" types now require manual approval that is rarely granted.
3. **User Friction:** Asking users to navigate Reddit's developer portal is unrealistic.

### New Strategy: Session Piggybacking

Instead of OAuth, Sxentrie uses the user's existing Reddit browser session:

```typescript
// reddit-api.ts
ky.create({
  prefixUrl: 'https://www.reddit.com', // Public endpoint, not oauth.reddit.com
  credentials: 'include', // Attach browser cookies
  headers: { 'User-Agent': 'web:sxentrie:v0.1.0' }
});
```

**How it works:**

- User logs into Reddit normally in Chrome
- Extension fetches `/r/subreddit/new.json` endpoints
- Chrome attaches session cookies automatically
- Reddit treats requests as authenticated browsing

**Trade-offs:**

- ✅ No API key required
- ✅ No OAuth flow implementation
- ✅ Works immediately for logged-in users
- ⚠️ User must be logged into Reddit
- ⚠️ May break if Reddit changes cookie policies

---

## Phase I: Infrastructure & Configuration ✅ COMPLETE

**Goal:** Directory hierarchy, configuration files, build targets.

| Task                                                | Status |
| --------------------------------------------------- | ------ |
| Vite multi-entry build (background, content, popup) | ✅     |
| Svelte 5 with Runes                                 | ✅     |
| TypeScript configuration                            | ✅     |
| Path aliases (@/, @services/, etc.)                 | ✅     |
| ESLint + Prettier                                   | ✅     |
| Manifest V3 definition                              | ✅     |
| Shadow DOM style injection (`css: 'injected'`)      | ✅     |
| Content script IIFE build                           | ✅     |
| Zinc/Void design tokens                             | ✅     |

---

## Phase II: The Brain (Ingestion Engine) ✅ COMPLETE

**Goal:** Service Worker fetching and parsing Reddit JSON.

| Task                                              | Status     |
| ------------------------------------------------- | ---------- |
| ~~BYOK OAuth flow~~                               | ❌ REMOVED |
| Session Piggybacking (`credentials: 'include'`)   | ✅         |
| `reddit-api.ts` with ky client                    | ✅         |
| `parser.ts` with Zod validation                   | ✅         |
| Rate limit header inspection                      | ✅         |
| `poller.ts` fetch loop                            | ✅         |
| Exponential backoff on errors                     | ✅         |
| L1 deduplication (in-memory Set)                  | ✅         |
| Multi-subreddit batching (`r/sub1+sub2/new.json`) | ✅         |
| Broadcast to all tabs                             | ✅         |
| Debug globals (`__SXENTRIE__`)                    | ✅         |

---

## Phase III: The Face (Overlay UI) ✅ COMPLETE

**Goal:** Floating HUD injected via Shadow DOM.

| Task                                        | Status |
| ------------------------------------------- | ------ |
| Shadow DOM host creation                    | ✅     |
| Programmatic content script injection       | ✅     |
| Toggle on icon click                        | ✅     |
| `HudContainer.svelte` (glassmorphism shell) | ✅     |
| `FeedList.svelte` (scrollable list)         | ✅     |
| `HitCard.svelte` (post display)             | ✅     |
| `Overlay.svelte` (root component)           | ✅     |
| Hit persistence to storage                  | ✅     |
| Hydration from storage on mount             | ✅     |
| Dismiss functionality                       | ✅     |
| Event trapping (keydown, wheel, mousedown)  | ✅     |
| Custom scrollbar styling                    | ✅     |

---

## Phase IV: The Nervous System (Wiring) 🔄 IN PROGRESS

**Goal:** Connect Brain to Face, handle user input.

| Task                                | Status  |
| ----------------------------------- | ------- |
| Message bus (background ↔ content)  | ✅      |
| Type-safe messaging (`messager.ts`) | ✅      |
| NEW_HIT broadcast to all tabs       | ✅      |
| START_SCAN / STOP_SCAN handlers     | ✅      |
| Settings panel UI                   | ⏳ TODO |
| Subreddit configuration input       | ⏳ TODO |
| Keyword configuration input         | ⏳ TODO |
| Poison keyword filtering            | ⏳ TODO |
| Drag-to-reposition overlay          | ⏳ TODO |

---

## Phase V: Intelligence & Filtering ⏳ TODO

**Goal:** Implement keyword matching and filtering.

| Task                                  | Status  |
| ------------------------------------- | ------- |
| `matcher.ts` - keyword regex          | ⏳ TODO |
| Include keywords filter               | ⏳ TODO |
| Exclude (poison) keywords filter      | ⏳ TODO |
| Filter integration in poller          | ⏳ TODO |
| L2 deduplication (idb-keyval)         | ⏳ TODO |
| Content hashing (SHA-256)             | ⏳ TODO |
| Simulation mode (mock data injection) | ⏳ TODO |

---

## Phase VI: The Voice & Expansion ⏳ TODO

**Goal:** Audio alerts and smart copy.

| Task                                 | Status  |
| ------------------------------------ | ------- |
| Offscreen document creation          | ⏳ TODO |
| Audio playback via offscreen         | ⏳ TODO |
| Keep-alive ping-pong                 | ⏳ TODO |
| Smart copy templates                 | ⏳ TODO |
| Quiet hours scheduling               | ⏳ TODO |
| Context profiles (save/load configs) | ⏳ TODO |
| Webhook integration                  | ⏳ TODO |

---

## Phase VII: Optimization & Release ⏳ TODO

**Goal:** Code audit and production build.

| Task                          | Status  |
| ----------------------------- | ------- |
| Console.log removal           | ⏳ TODO |
| Bundle size optimization      | ⏳ TODO |
| Post-build eval() check       | ⏳ TODO |
| Icon generation (16, 48, 128) | ⏳ TODO |
| Audio file compression        | ⏳ TODO |
| ZIP packaging                 | ⏳ TODO |
| Chrome Web Store listing      | ⏳ TODO |

---

## Completed Milestones

### v0.1.0 - Foundation (Current)

- ✅ Session Piggybacking authentication
- ✅ Real-time polling of configured subreddits
- ✅ Floating overlay with hit display
- ✅ Cross-tab state persistence
- ✅ Deduplication (L1)
- ✅ Glassmorphism "Zinc & Void" design

### Next: v0.2.0 - Configuration

- Settings UI for subreddit/keyword management
- Keyword filtering
- Poison keyword exclusion

### Future: v0.3.0 - Alerts

- Audio notifications
- Smart copy templates
- Quiet hours

---

**End of Roadmap.**
