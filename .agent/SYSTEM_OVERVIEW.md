# system overview: sxentrie (reddithawk)

## executive summary

**sxentrie** is a chrome extension (manifest v3) that monitors reddit in real-time for new posts matching user-defined criteria. built for freelancers and agencies who need to be "first responders" to opportunities posted on reddit.

**core innovation**: session piggybacking authentication bypasses reddit's api lockdown by leveraging the user's existing browser session instead of requiring formal oauth credentials.

**tech stack**:

- react 19 + typescript
- tailwind css v4 (zinc/void monochromatic palette)
- vite (build tool)
- ky (http client), zod (validation), date-fns (formatting)
- chrome apis: sidepanel, alarms, storage, offscreen

**architecture**: dual-process design with background service worker ("the brain") and chrome side panel ui ("the face"). audio notifications via offscreen document ("the voice").

---

## critical context: api strategy pivot

### the problem

reddit locked down api access in 2024-2025. self-service api key creation is effectively blocked. even "installed app" types require manual approval that's rarely granted.

### the solution: session piggybacking

instead of oauth, sxentrie uses the user's existing reddit browser session:

```typescript
// in reddit-api.ts
ky.create({
  prefixUrl: 'https://www.reddit.com', // public endpoint
  credentials: 'include', // attach browser cookies
  headers: { 'User-Agent': 'web:sxentrie:v0.2.0' }
});
```

**how it works**:

1. user logs into reddit normally in chrome
2. extension fetches `/r/subreddit/new.json` endpoints
3. chrome automatically attaches session cookies
4. reddit treats requests as authenticated browsing

**trade-offs**:

- ✅ no api key required
- ✅ works immediately for logged-in users
- ⚠️ user must be logged into reddit in browser
- ⚠️ may break if reddit changes cookie policies

---

## architecture diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         SXENTRIE SYSTEM                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────────────┐         ┌──────────────────────┐     │
│  │   THE BRAIN          │ ───────▶│   THE FACE           │     │
│  │ (Service Worker)     │ broadcast│ (Chrome Side Panel) │     │
│  │                      │         │                      │     │
│  │ • poller.ts          │         │ • App.tsx (root)     │     │
│  │ • reddit-api.ts      │         │ • FeedList.tsx       │     │
│  │ • matcher.ts         │         │ • HitCard.tsx        │     │
│  │ • parser.ts          │         │ • SettingsPanel.tsx  │     │
│  │ • audio-manager.ts   │         │                      │     │
│  │                      │         │ • useChromeStorage() │     │
│  └──────┬───────────────┘         └──────────────────────┘     │
│         │                                                       │
│         │ persists                                              │
│         ▼                                                       │
│  ┌──────────────────────┐                                      │
│  │ chrome.storage       │                                      │
│  │                      │                                      │
│  │ • config (local)     │                                      │
│  │ • hits_cache (local) │                                      │
│  │ • seenSet (session)  │                                      │
│  └──────────────────────┘                                      │
│                                                                  │
│  ┌──────────────────────┐                                      │
│  │   THE VOICE          │                                      │
│  │ (Offscreen Document) │                                      │
│  │                      │                                      │
│  │ • audio-player.ts    │                                      │
│  │ • plays mp3 alerts   │                                      │
│  └──────────────────────┘                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## data flow

### 1. initialization (background service worker)

```
service worker wake-up
  ↓
init() in background/index.ts
  ↓
registerHandlers() — sets up message listeners
  ↓
hydrateAuth() — loads auth state from storage
  ↓
isAuthenticated() → true?
  ↓ YES
startPolling()
  ↓
creates chrome.alarms.create('sxentrie_poller')
  ↓
schedules first poll()
```

### 2. polling loop (background → reddit → side panel)

```
alarm fires (chrome.alarms.onAlarm)
  ↓
handleAlarm() routes to poll()
  ↓
loadConfig() from chrome.storage.local
  ↓
loadSeenIds() from chrome.storage.session
  ↓
fetchSubredditBatch(subreddits) via reddit-api.ts
  ↓
ky.get('r/sub1+sub2+sub3/new.json')
  ↓ (credentials: 'include' attaches cookies)
reddit responds with json
  ↓
parseRedditResponse() via parser.ts (zod validation)
  ↓
filter out seen IDs (deduplication)
  ↓
filterHits() via matcher.ts (keyword filtering)
  ↓
mark all unseen as seen → saveSeenIds()
  ↓
broadcast matched hits via chrome.runtime.sendMessage({type: 'NEW_HIT'})
  ↓
side panel receives message → addHit() → updates ui
  ↓
if audioEnabled: playNotificationSound()
  ↓
schedules next poll via chrome.alarms
```

### 3. user interaction (side panel → background)

```
user opens side panel
  ↓
App.tsx mounts
  ↓
hydrates hits from chrome.storage.local['sxentrie_hits_cache']
  ↓
listens for chrome.runtime.onMessage
  ↓
user edits settings
  ↓
SettingsPanel.tsx → handleSave()
  ↓
useChromeStorage().save(config)
  ↓
saves to chrome.storage.local['config']
  ↓
poller picks up new config on next poll cycle
```

---

## file tree (annotated)

```
reddit-hawk/
├── manifest.json                    # mv3 manifest (permissions, background, sidepanel)
├── package.json                     # deps: react, tailwind, ky, zod, date-fns
├── vite.config.ts                   # multi-entry build: background, sidepanel, offscreen
├── tailwind.config.js               # zinc/void palette config
├── tsconfig.json                    # typescript config
├── README.md                        # user docs (api strategy, setup)
├── roadmap.md                       # project status (phases i-vii)
│
├── assets/
│   ├── icons/                       # extension icons (16, 48, 128)
│   └── audio/                       # notification.mp3
│
├── src/
│   ├── background/                  # service worker (the brain)
│   │   ├── index.ts                 # entry point, message handlers, init
│   │   ├── poller.ts                # alarm-based polling engine, deduplication
│   │   └── audio-manager.ts         # offscreen document lifecycle
│   │
│   ├── sidepanel/                   # chrome side panel (the face)
│   │   ├── index.html               # html entry
│   │   ├── main.tsx                 # react mount point
│   │   └── App.tsx                  # root component (tabs, hit persistence)
│   │
│   ├── ui/components/               # react components
│   │   ├── FeedList.tsx             # scrollable list of hits
│   │   ├── HitCard.tsx              # individual post card
│   │   └── SettingsPanel.tsx        # config ui
│   │
│   ├── services/                    # pure logic (no chrome apis)
│   │   ├── auth.ts                  # dummy guest mode service
│   │   ├── reddit-api.ts            # ky client, session piggybacking, rate limits
│   │   ├── parser.ts                # json → hit transformation (zod)
│   │   └── matcher.ts               # keyword filtering (include/exclude)
│   │
│   ├── lib/                         # shared libraries
│   │   ├── storage.ts               # useChromeStorage() hook, useConfig()
│   │   └── fonts.ts                 # font loading
│   │
│   ├── offscreen/                   # audio playback document (the voice)
│   │   ├── offscreen.html           # minimal html host
│   │   └── audio-player.ts          # plays mp3 files
│   │
│   ├── types/                       # typescript definitions
│   │   └── schemas.ts               # zod schemas (Hit, Config, Messages)
│   │
│   ├── utils/                       # helpers
│   │   ├── constants.ts             # global config (defaults, limits)
│   │   ├── messager.ts              # type-safe messaging
│   │   ├── logger.ts                # namespaced console logging
│   │   └── debug.ts                 # debug utilities (__SXENTRIE__ global)
│   │
│   └── styles/
│       └── index.css                # tailwind imports
│
└── dist/ (generated by vite build)
    ├── manifest.json
    ├── assets/
    │   ├── background.js            # compiled service worker
    │   ├── sidepanel-*.js           # react bundle
    │   ├── offscreen-*.js
    │   └── index-*.css              # tailwind output
    └── src/
        ├── sidepanel/index.html
        └── offscreen/offscreen.html
```

---

## key modules breakdown

### background/poller.ts

**purpose**: orchestrates the fetching loop using chrome.alarms for reliability across service worker terminations.

**key functions**:

- `poll()` — core loop: load config → fetch → dedupe → filter → broadcast → schedule next
- `startPolling()` — sets isRunning flag, creates alarm
- `stopPolling()` — clears alarm
- `handleAlarm()` — routes alarm events to poll()
- `loadSeenIds()` / `saveSeenIds()` — manages L1 cache (Set<string>) in chrome.storage.session

**state management**:

- runtime state: `isRunning`, `consecutiveErrors` (in-memory, non-persisted)
- persistent state: config (local), seenSet (session)

**error handling**:

- exponential backoff on fetch failures
- circuit breaker for rate limits (RateLimitError)

### services/reddit-api.ts

**purpose**: http client for reddit's public .json endpoints. implements session piggybacking.

**key features**:

- `fetchSubredditBatch()` — fetches `/r/sub1+sub2/new.json`
- passive rate limit inspection via response headers (x-ratelimit-\*)
- throws `RateLimitError` when threshold reached
- ky retry logic for transient failures

**anti-pattern**: no api key, no oauth. relies on browser cookies.

### services/matcher.ts

**purpose**: keyword filtering engine.

**logic**:

- if `include` keywords exist → hit MUST match at least one
- if `exclude` (poison) keywords exist → hit MUST NOT match any
- if no keywords set → all hits pass

**implementation**: case-insensitive regex with escaping.

### ui/components/SettingsPanel.tsx

**purpose**: configuration ui for subreddits, keywords, polling interval, audio toggle.

**state management**: uses `useConfig()` hook which wraps `useChromeStorage()`.

**persistence**: saves to chrome.storage.local['config']. changes are picked up by poller on next cycle.

### lib/storage.ts

**purpose**: react hook for chrome.storage with cross-tab sync.

**key features**:

- `useChromeStorage(key, defaultValue)` — generic hook
- listens for chrome.storage.onChanged — updates state when storage changes from other contexts
- `useConfig()` — convenience hook specifically for config

### offscreen/audio-player.ts

**purpose**: plays notification sounds. lives in offscreen document (manifest v3 requirement — service workers can't play audio).

**lifecycle**:

- background creates offscreen document when needed (background/audio-manager.ts)
- listens for `PLAY_SOUND` messages
- plays mp3 from assets/audio/

---

## type safety (zod)

**philosophy**: resilience over strictness. graceful fallbacks for volatile fields.

### Hit schema

```typescript
export const HitSchema = z.object({
  // required — fail if missing
  id: z.string(),
  title: resilient(z.string(), '[untitled]'),
  subreddit: z.string(),
  permalink: z.string(),

  // volatile — graceful fallbacks
  author: resilient(z.string(), '[deleted]'),
  url: resilient(z.string().optional(), undefined),
  selftext: resilient(z.string().optional(), undefined),
  created_utc: resilient(coerceNumber, Date.now() / 1000)
  // ...
});
```

**resilient() helper**: catches validation errors, logs in debug mode, returns fallback.

### Config schema

```typescript
export const ConfigSchema = z.object({
  subreddits: resilient(z.array(z.string()), []),
  keywords: resilient(z.array(z.string()), []),
  poisonKeywords: resilient(z.array(z.string()), []),
  pollingInterval: resilient(z.number().min(10).max(300), 30),
  audioEnabled: resilient(z.boolean(), true),
  quietHours: resilient(z.object({...}), {...}),
});
```

---

## storage strategy

### chrome.storage.local (persistent)

- `config` — user settings (subreddits, keywords, interval, audio)
- `sxentrie_hits_cache` — recent hits (max 100, shown in feed)

### chrome.storage.session (ephemeral)

- `seenSet` — array of post IDs already processed (cleared on browser restart)
- **rationale**: L1 cache for fast O(1) deduplication. capped at 1000 IDs to prevent bloat.

---

## build system (vite)

**multi-entry configuration**:

```typescript
// vite.config.ts
rollupOptions: {
  input: {
    background: 'src/background/index.ts',
    sidepanel: 'src/sidepanel/index.html',
    offscreen: 'src/offscreen/offscreen.html'
  },
  output: {
    entryFileNames: 'assets/[name].js',
    chunkFileNames: 'assets/[name].js',
    assetFileNames: 'assets/[name].[ext]'
  }
}
```

**path aliases**:

- `@/` → `src/`
- `@services/` → `src/services/`
- `@utils/` → `src/utils/`
- `@ui/` → `src/ui/`
- `@lib/` → `src/lib/`

**plugins**:

- `@vitejs/plugin-react` — jsx transformation
- `@tailwindcss/vite` — tailwind css v4
- `vite-plugin-static-copy` — copies manifest.json, assets

---

## design system (zinc/void)

**palette**: monochromatic zinc + emerald accent.

**typography**: system fonts, antialiased, high-density.

**components**:

- bg: `zinc-950` (dark void)
- borders: `zinc-700/800` (subtle cuts)
- text: `zinc-200` (readable), `zinc-500` (muted)
- accent: `emerald-500` (active state, subreddit tags)

**ui philosophy**: compact, functional, terminal-inspired.

---

## messaging layer

### type-safe messaging (utils/messager.ts)

**pattern**: string literal types + payload inference.

```typescript
type MessageType =
  | 'START_SCAN'
  | 'STOP_SCAN'
  | 'UPDATE_CONFIG'
  | 'NEW_HIT'
  | 'PLAY_SOUND'
  | 'KEEP_ALIVE'
  | 'LOG_ENTRY';

onMessage('NEW_HIT', (payload /* inferred as Hit */, sender) => {
  addHit(payload);
});
```

---

## deduplication strategy

### L1 cache (in-memory set)

- stored in chrome.storage.session as array (converted to Set on load)
- O(1) lookups
- survives service worker termination (chrome.alarms restores session)
- cleared on browser restart (intentional — fresh scan after reboot)

### future: L2 cache (idb-keyval)

- planned for phase vi
- content hashing (sha-256) for cross-session persistence
- useful for users who want "never show this again" across restarts

---

## debugging

### debug globals (utils/debug.ts)

exposed via `window.__SXENTRIE__` in debug mode:

```javascript
__SXENTRIE__ = {
  authState: { ... },
  apiState: { remaining, reset, used },
  pollerState: { isRunning, errorCount, getSeenCount },
  version: '0.2.0'
}
```

### namespaced logging (utils/logger.ts)

```typescript
log.bg.info('starting poller');
log.api.debug('rate limit updated');
log.poller.warn('fetch failed');
log.ui.error('failed to save settings');
```

---

## current status (v0.2.0)

### completed phases

- ✅ phase i: infrastructure & configuration (vite, react, tailwind, manifest v3)
- ✅ phase ii: the brain (session piggybacking, poller, deduplication, rate limits)
- ✅ phase iii: the face (chrome side panel, react ui, persistence)
- ✅ phase iv: configuration & filtering (settings panel, keyword matching)
- ✅ phase v: the voice (offscreen audio, notifications)

### pending phases

- ⏳ phase vi: advanced features (quiet hours, smart copy templates, webhooks, L2 cache)
- ⏳ phase vii: optimization & release (console.log removal, bundle size, chrome web store)

---

## known limitations

1. **requires reddit login**: user must be logged into reddit in browser for session piggybacking to work.

2. **public endpoints only**: cannot access private subreddits or user-specific feeds without formal oauth.

3. **rate limits**: ~100 requests per 10 minutes with session cookies. built-in circuit breaker prevents hitting limits.

4. **side panel support**: requires chrome 114+ for side panel api.

5. **cookie dependency**: if reddit changes cookie policies (e.g., httponly, samesite), this may break.

---

## glossary

- **hit**: a reddit post that matches user criteria. represented by `Hit` type (zod schema).
- **session piggybacking**: leveraging the user's existing browser session (cookies) to make authenticated requests without oauth.
- **L1 cache**: in-memory deduplication set (stored in chrome.storage.session).
- **the brain**: background service worker (src/background/).
- **the face**: chrome side panel ui (src/sidepanel/).
- **the voice**: offscreen document for audio playback (src/offscreen/).
- **rogue mode**: informal term for operating without formal api credentials.
- **zinc/void**: monochromatic design palette (zinc grays + emerald accent).

---

## dependency graph

```
react 19                 → ui framework
react-dom 19             → dom rendering
tailwindcss 4            → styling (zinc palette)
ky 1.7                   → http client (session piggybacking)
zod 3.24                 → runtime validation
date-fns 4.1             → date formatting (timeAgo)
dompurify 3.2            → html sanitization (future)
idb-keyval 6.2           → indexeddb (L2 cache — planned)

vite 6                   → build tool
@vitejs/plugin-react     → jsx transformation
@tailwindcss/vite        → tailwind integration
vite-plugin-static-copy  → asset copying
typescript 5.7           → type safety
eslint + prettier        → code quality
```

---

## end of overview

**last updated**: 2025-12-06
**version**: 0.2.0
**status**: functional, production-ready core. advanced features pending.
