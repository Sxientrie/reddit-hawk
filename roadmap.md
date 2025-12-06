# Project Roadmap: Sxentrie (RedditHawk)

**Format:** Technical directives with completion status.
**Objective:** Chrome Extension (MV3). Real-time Reddit monitor.
**Design Standard:** Zinc/Void Monochromatic. Tailwind CSS.
**Code Standard:** **React 19** + TypeScript via Vite. Max 300 lines/file.

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
  headers: { 'User-Agent': 'web:sxentrie:v0.2.0' }
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

| Task | Status |
| --- | --- |
| Vite multi-entry build (background, sidepanel) | ✅ |
| React 19 + TypeScript | ✅ |
| Tailwind CSS v4 | ✅ |
| Path aliases (@/, @services/, etc.) | ✅ |
| ESLint + Prettier (React configs) | ✅ |
| Manifest V3 definition | ✅ |
| Chrome Side Panel API integration | ✅ |
| Zinc/Void design tokens (Tailwind) | ✅ |

---

## Phase II: The Brain (Ingestion Engine) ✅ COMPLETE

**Goal:** Service Worker fetching and parsing Reddit JSON.

| Task | Status |
| --- | --- |
| ~~BYOK OAuth flow~~ | ❌ REMOVED |
| Session Piggybacking (`credentials: 'include'`) | ✅ |
| `reddit-api.ts` with ky client | ✅ |
| `parser.ts` with Zod validation | ✅ |
| Rate limit header inspection | ✅ |
| `poller.ts` with chrome.alarms | ✅ |
| Exponential backoff on errors | ✅ |
| L1 deduplication (Set in chrome.storage.session) | ✅ |
| Multi-subreddit batching (`r/sub1+sub2/new.json`) | ✅ |
| Broadcast to side panel | ✅ |
| Debug globals (`__SXENTRIE__`) | ✅ |

---

## Phase III: The Face (Side Panel UI) ✅ COMPLETE

**Goal:** Native Chrome Side Panel for persistent UI.

| Task | Status |
| --- | --- |
| ~~Shadow DOM overlay~~ | ❌ REMOVED |
| Chrome Side Panel registration | ✅ |
| `sidePanel.setPanelBehavior` on icon click | ✅ |
| `App.tsx` (side panel root) | ✅ |
| `FeedList.tsx` (scrollable list) | ✅ |
| `HitCard.tsx` (post display) | ✅ |
| `SettingsPanel.tsx` (configuration) | ✅ |
| Hit persistence to storage | ✅ |
| Hydration from storage on mount | ✅ |
| Dismiss functionality | ✅ |
| Tabbed navigation (Feed/Settings) | ✅ |
| Custom scrollbar styling | ✅ |

**Side Panel Benefits:**

- ✅ Persists across tab switches
- ✅ No ghost overlays when extension reloads
- ✅ Native Chrome UI integration
- ✅ Clean lifecycle management

---

## Phase IV: Configuration & Filtering ✅ COMPLETE

**Goal:** User-configurable subreddits and keyword filtering.

| Task | Status |
| --- | --- |
| Settings panel UI | ✅ |
| Subreddit configuration input | ✅ |
| Keyword (include) configuration | ✅ |
| Poison keyword (exclude) config | ✅ |
| Polling interval configuration | ✅ |
| Audio toggle | ✅ |
| Save/Reset functionality | ✅ |
| `matcher.ts` - keyword filtering | ✅ |
| Empty default config (user must add) | ✅ |
| Settings persistence (storage.local) | ✅ |

---

## Phase V: The Voice (Audio Alerts) ✅ COMPLETE

**Goal:** Audio notifications for new hits.

| Task | Status |
| --- | --- |
| Offscreen document creation | ✅ |
| Audio playback via offscreen | ✅ |
| Audio toggle in settings | ✅ |
| Notification sound bundled | ✅ |

---

## Phase VI: Advanced Features ⏳ TODO

**Goal:** Power user features.

| Task | Status |
| --- | --- |
| Quiet hours scheduling | ⏳ TODO |
| Smart copy templates | ⏳ TODO |
| Context profiles (save/load configs) | ⏳ TODO |
| Webhook integration | ⏳ TODO |
| L2 deduplication (idb-keyval) | ⏳ TODO |
| Content hashing (SHA-256) | ⏳ TODO |

---

## Phase VII: Optimization & Release ⏳ TODO

**Goal:** Code audit and production build.

| Task | Status |
| --- | --- |
| Console.log removal | ⏳ TODO |
| Bundle size optimization | ⏳ TODO |
| Post-build eval() check | ⏳ TODO |
| Icon generation (16, 48, 128) | ✅ |
| Audio file compression | ⏳ TODO |
| ZIP packaging | ⏳ TODO |
| Chrome Web Store listing | ⏳ TODO |

---

## Completed Milestones

### v0.2.0 - React Migration (Current)

- ✅ Migrated from Svelte to React 19 + TypeScript
- ✅ Added Tailwind CSS v4 for styling
- ✅ Cleaned up all Svelte artifacts
- ✅ Implemented `useChromeStorage` hooks
- ✅ Verified Side Panel + Background sync

### v0.1.1 - Side Panel Migration

- ✅ Migrated from content script overlay to Chrome Side Panel
- ✅ Eliminated ghost overlay issues
- ✅ Settings UI fully functional
- ✅ Empty defaults (user configures their own subreddits)
- ✅ Audio notifications working
- ✅ Persistent panel across tab switches

### v0.1.0 - Foundation

- ✅ Session Piggybacking authentication
- ✅ Real-time polling of configured subreddits
- ✅ Floating overlay (deprecated)
- ✅ Cross-tab state persistence
- ✅ Deduplication (L1)

---

**End of Roadmap.**
