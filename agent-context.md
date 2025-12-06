# agent context map

**project:** sxentrie (reddit-hawk)  
**generated:** 2025-12-07  
**purpose:** deep-scan analysis of codebase architecture and patterns

---

## 1. the stack

### core runtime

- **platform:** chrome extension (manifest v3)
- **language:** typescript (strict mode, ESNext target)
- **build:** vite 6 + multi-entry rollup
- **bundler config:** `vite.config.ts` (background, sidepanel, offscreen)

### frontend

- **framework:** react 19 (migrated from svelte in v0.2.0)
- **styling:** tailwind css v4 (beta.8)
- **ui location:** chrome side panel (chrome 114+)
- **state:** react hooks + chrome.storage.local reactive bindings
- **virtualization:** react-window + react-virtualized-auto-sizer

### http/validation

- **http client:** ky (fetch wrapper with retry, hooks)
- **validation:** zod schemas with resilient parsing
- **sanitization:** dompurify (user-generated content)

### chrome apis

- `chrome.sidePanel` – persistent ui across tabs
- `chrome.alarms` – reliable polling schedule (survives sw termination)
- `chrome.storage.local` – config/hits persistence
- `chrome.storage.session` – ephemeral deduplication cache
- `chrome.offscreen` – audio playback (sw cannot play audio directly)
- `chrome.tabs` – cross-tab messaging

### authentication strategy

**"session piggybacking"** (rogue mode):

- no reddit api key required
- uses `credentials: 'include'` to piggyback on browser's reddit session cookies
- fetches public json endpoints (`www.reddit.com/r/sub/new.json`)
- passive rate limit inspection via response headers

---

## 2. the architecture

### data flow (alarm → network → storage → ui)

```
┌────────────────────────────────────────────────────────────────┐
│                    chrome extension runtime                     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────┐     chrome.alarms      ┌──────────────┐  │
│  │ SERVICE WORKER   │◄────────────────────────┤ chrome.alarm │  │
│  │ (background/)    │                         └──────────────┘  │
│  │                  │                                           │
│  │ • poller.ts      │──┐                                        │
│  │ • index.ts       │  │ fetch()                                │
│  │ • audio-manager  │  │ credentials: 'include'                 │
│  └──────┬───────────┘  │                                        │
│         │              ▼                                        │
│         │    ┌─────────────────────┐                            │
│         │    │ reddit.com/r/.../new │                           │
│         │    │ (session cookies)    │                           │
│         │    └──────────┬──────────┘                            │
│         │               │                                       │
│         │               │ json response                         │
│         │               ▼                                       │
│         │    ┌─────────────────────┐                            │
│         │    │   services/         │                            │
│         │    │   • reddit-api.ts   │                            │
│         │    │   • parser.ts       │                            │
│         │    │   • matcher.ts      │                            │
│         │    └──────────┬──────────┘                            │
│         │               │                                       │
│         │               │ filtered hits                         │
│         │               ▼                                       │
│         │    ┌─────────────────────┐                            │
│         │    │ chrome.storage      │                            │
│         │    │ • local (persist)   │                            │
│         │    │ • session (cache)   │                            │
│         │    └──────────┬──────────┘                            │
│         │               │                                       │
│         │               │ storage.onChanged                     │
│         │               ▼                                       │
│         │    ┌─────────────────────┐                            │
│         │    │  SIDE PANEL (UI)    │                            │
│         │    │  sidepanel/         │                            │
│         │    │  • App.tsx          │                            │
│         │    │  • FeedList.tsx     │                            │
│         │    │  • SettingsPanel    │                            │
│         │    └─────────────────────┘                            │
│         │                                                       │
│         │ (optional)                                            │
│         ▼                                                       │
│  ┌──────────────────┐                                           │
│  │ OFFSCREEN DOC    │                                           │
│  │ offscreen/       │                                           │
│  │ audio-player.ts  │                                           │
│  └──────────────────┘                                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### architectural patterns

**event-driven polling:**

- `chrome.alarms` schedules next poll (alarm-based, not setInterval)
- survives service worker termination/wake cycles
- backoff on rate limits or consecutive errors
- concurrency lock (`isBusy` flag) prevents overlapping executions

**hybrid storage strategy:**

- **session storage:** ephemeral deduplication cache (`Set<postId>`)
- **local storage:** config, cached hits, latest hit timestamp
- **dual-layer deduplication:** seen ids + timestamp threshold (prevents zombie hits)

**reactive ui pattern:**

- service worker writes hits to `chrome.storage.local` (source of truth)
- side panel listens to `chrome.storage.onChanged`
- automatic reactive updates without manual messaging
- optimistic ui (mutations write back to storage immediately)

**resilient parsing:**

- zod schemas with `.catch()` fallbacks
- graceful degradation for malformed reddit api responses
- debug logging for validation failures (production-silent)

**type-safe messaging:**

- discriminated union wrapper around `chrome.runtime.sendMessage`
- `MessagePayloadMap` + `MessageResponseMap` for compile-time safety
- automatic payload/response inference

---

## 3. the hotspots (where the main logic lives)

### service worker (background/)

**`background/index.ts`** (115 lines)  
_entry point, message routing_

- init sequence: hydrate auth → register handlers → start poller
- message handlers: `START_SCAN`, `STOP_SCAN`, `UPDATE_CONFIG`, `LOG_ENTRY`
- debug globals mounting (`window.__sxentrie_debug__`)

**`background/poller.ts`** (342 lines)  
_core polling engine_

- alarm-based scheduling (`chrome.alarms.create`)
- fetch → parse → deduplicate → filter → notify workflow
- concurrency lock (`isBusy`), exponential backoff
- storage hydration/persistence for stateless sw context
- timestamp-based zombie prevention after browser restart

**`background/audio-manager.ts`** (1.9kb)  
_offscreen document orchestrator_

- creates/destroys offscreen.html for audio playback
- mv3 limitation: service workers cannot play audio directly

---

### services (pure logic, no chrome apis)

**`services/reddit-api.ts`** (170 lines)  
_http client for reddit json endpoints_

- ky client with session cookie piggybacking
- passive rate limit inspection via `afterResponse` hook
- rate limit state persistence (`chrome.storage.session`)
- multi-subreddit batching (`r/sub1+sub2+sub3/new.json`)
- `RateLimitError` circuit breaker

**`services/matcher.ts`** (119 lines)  
_keyword filtering engine_

- strict 1+1=2 rule: keywords are MANDATORY (no keywords = zero hits)
- regex-based matching with word boundary detection
- handles edge cases: "C++" (no boundaries), ".NET" (partial boundaries)
- include/exclude (poison) keyword logic

**`services/parser.ts`** (1.3kb)  
_reddit json → Hit transformation_

- wraps zod schema validation
- filters out null/malformed posts

**`services/auth.ts`** (1.6kb)  
_dummy guest mode service_

- placeholder for future oauth implementation
- currently returns "guest" mode (always authenticated via session cookies)

---

### ui (react components)

**`sidepanel/App.tsx`** (128 lines)  
_root component_

- tab switching (feed/settings)
- hydrates hits from storage on mount
- listens to `chrome.storage.onChanged` for reactive updates
- dismiss handler (writes filtered list back to storage)

**`ui/components/FeedList.tsx`** (1.1kb)  
_virtualized list of hits_

- react-window for performance on large lists
- empty state handling

**`ui/components/HitCard.tsx`** (2.6kb)  
_individual post card_

- displays: subreddit, author, title, timestamp
- click → open reddit post in new tab
- dismiss button

**`ui/components/SettingsPanel.tsx`** (12.7kb)  
_configuration ui_

- subreddits, keywords, poison keywords, polling interval
- manual start/stop scan buttons
- save button writes to `chrome.storage.local`

---

### utils (shared helpers)

**`utils/messager.ts`** (152 lines)  
_type-safe runtime messaging_

- `MessagePayloadMap` + `MessageResponseMap` for inference
- `sendMessage<T>()` and `onMessage<T>()` wrappers
- remote logging helper for centralized debug in sw console

**`utils/logger.ts`** (2.2kb)  
_namespaced console wrapper_

- `log.bg`, `log.api`, `log.poller`, `log.ui`
- respects `IS_DEBUG` flag

**`utils/debug.ts`** (2kb)  
_debug utilities_

- `mountDebugGlobals()` → exposes internal state to `window.__sxentrie_debug__`
- dev tools introspection

**`utils/constants.ts`** (1kb)  
_global config_

- reddit base urls, polling limits, storage keys, alarm names

---

### lib (shared infrastructure)

**`lib/storage.ts`** (74 lines)  
_reactive chrome.storage hook_

- `useChromeStorage<T>(key, defaultValue)` hook
- automatic cross-tab sync via `chrome.storage.onChanged`
- `save()`, `reset()` helpers

**`lib/fonts.ts`** (2.4kb)  
_font loading_

- preloads google fonts for ui
- ensures `font-display: swap` to prevent invisible text

---

### types (data contracts)

**`types/schemas.ts`** (144 lines)  
_zod schemas_

- `HitSchema` – reddit post structure
- `ConfigSchema` – extension config
- `MessageTypeSchema` – runtime message types
- resilient parsing with `.catch()` fallbacks

---

## 4. critical configuration files

**`manifest.json`**

- permissions: `alarms`, `storage`, `offscreen`, `tabs`, `notifications`, `sidePanel`
- host_permissions: `oauth.reddit.com`, `www.reddit.com/r/*/new.json`
- background: `service_worker: assets/background.js` (type: module)
- side_panel: `default_path: src/sidepanel/index.html`

**`vite.config.ts`**

- multi-entry rollup: `background`, `sidepanel`, `offscreen`
- static copy plugin: copies `manifest.json`, `assets/`
- path aliases: `@/*`, `@lib/*`, `@ui/*`, `@services/*`, `@utils/*`
- hmr disabled (incompatible with mv3)
- conditional minify (production only)

**`tsconfig.json`**

- strict mode enabled
- jsx: react-jsx (react 17+ transform)
- types: `chrome`, `node`
- path aliases mirror vite config

**`package.json`**

- name: `sxentrie`
- version: `0.2.0`
- scripts: `dev`, `build`, `check`, `lint`, `format`
- key deps: react 19, tailwind v4, ky, zod, dompurify, date-fns, idb-keyval

---

## 5. data persistence strategy

### chrome.storage.local (persistent)

- `config` – user settings (subreddits, keywords, interval)
- `sxentrie_hits_cache` – cached hits (max 100)
- `latestHitTimestamp` – threshold for zombie prevention
- `rateLimits` – api rate limit state (fallback if session unavailable)

### chrome.storage.session (ephemeral)

- `seenSet` – deduplication cache (`Set<postId>`)
- `rateLimits` – preferred location for rate limit state (cleared on browser close)

### runtime state (non-persisted)

- `isRunning`, `isBusy`, `consecutiveErrors` – poller state (recalculated on sw wake)

---

## 6. known constraints and quirks

**service worker lifecycle:**

- sw may terminate after 30s of inactivity (mv3 limitation)
- `chrome.alarms` survives termination → reliable polling
- state must be rehydrated from storage on wake-up

**session piggybacking fragility:**

- requires user to be logged into reddit in browser
- breaks if reddit changes cookie policies or json endpoint structure
- not suitable for server-side/headless deployment

**side panel api:**

- requires chrome 114+
- cannot be programmatically opened on extension install (user must click icon)
- panel persists across tabs (feature, not bug)

**offscreen audio:**

- mv3 service workers cannot play audio → requires offscreen document workaround
- offscreen document is created/destroyed on demand

**rate limits:**

- reddit public endpoints: ~100 requests per 10 minutes (passive inspection only)
- no proactive 429 prevention (circuit breaker triggers after first 429)
- backoff logic prevents ban

**keyword filtering strictness:**

- mandatory keywords (no keywords = zero hits)
- prevents "firehose mode" (user must explicitly configure targets)

---

## 7. development workflow

### commands

- `npm run dev` – vite watch mode (hmr disabled)
- `npm run build` – production build to `dist/`
- `npm run check` – typescript type check (no emit)
- `npm run lint` – eslint (ts/tsx)
- `npm run format` – prettier

### loading unpacked extension

1. navigate to `chrome://extensions/`
2. enable "developer mode"
3. click "load unpacked"
4. select `dist/` folder

### debugging

- service worker console: `chrome://extensions/` → "Inspect views: service worker"
- side panel: right-click panel → "Inspect"
- debug globals: open sw console → `window.__sxentrie_debug__`

---

## 8. future roadmap hints (from memory files)

- **authentication persistence:** save/re-hydrate oauth tokens
- **ui hydration reliability:** enhance ChromeStorageProxy with ready state
- **input sanitization:** dompurify for user-generated content
- **vite + crxjs:** migrate to crxjs plugin for better mv3 support
- **semantic tokenization:** refactor hardcoded colors to tailwind tokens
- **responsive logic:** collapsing state for mobile viewports

---

## 9. directory structure (annotated)

```
reddit-hawk/
├── .agent/
│   └── workflows/                    // automation recipes
├── assets/
│   ├── icons/                        // extension icons (16, 48, 128)
│   └── audio/                        // .mp3 alert sounds
├── src/
│   ├── background/                   // "the brain" (service worker)
│   │   ├── index.ts                  // entry, message routing
│   │   ├── poller.ts                 // alarm-based fetch loop
│   │   └── audio-manager.ts          // offscreen orchestration
│   ├── sidepanel/                    // "the face" (side panel ui)
│   │   ├── index.html                // entry html
│   │   ├── main.tsx                  // react mount
│   │   └── App.tsx                   // root component
│   ├── services/                     // pure logic (no chrome apis)
│   │   ├── auth.ts                   // guest mode placeholder
│   │   ├── reddit-api.ts             // http client (ky)
│   │   ├── parser.ts                 // json → Hit
│   │   └── matcher.ts                // keyword filtering
│   ├── ui/components/                // react components
│   │   ├── FeedList.tsx              // virtualized list
│   │   ├── HitCard.tsx               // post card
│   │   └── SettingsPanel.tsx         // config ui
│   ├── lib/                          // shared infrastructure
│   │   ├── storage.ts                // reactive chrome.storage hook
│   │   └── fonts.ts                  // font loading
│   ├── types/                        // data contracts
│   │   └── schemas.ts                // zod schemas
│   ├── offscreen/                    // audio playback document
│   │   ├── offscreen.html
│   │   └── audio-player.ts
│   ├── utils/                        // helpers
│   │   ├── constants.ts              // global config
│   │   ├── messager.ts               // type-safe messaging
│   │   ├── logger.ts                 // namespaced console
│   │   └── debug.ts                  // debug utilities
│   └── styles/
│       └── globals.css               // tailwind entry
├── dist/                             // build output (git-ignored)
├── node_modules/                     // dependencies (git-ignored)
├── manifest.json                     // chrome extension manifest
├── vite.config.ts                    // multi-entry build config
├── tsconfig.json                     // typescript config
├── tailwind.config.js                // tailwind config (if exists)
├── package.json                      // npm metadata
└── README.md                         // project documentation
```

---

## 10. mental model summary

**sxentrie is:**

- chrome extension monitoring reddit for freelance opportunities
- alarm-driven polling engine with deduplication and keyword filtering
- session piggybacking (no api key) via public json endpoints
- react side panel ui with reactive chrome.storage bindings
- strict keyword filtering (mandatory keywords to prevent firehose)

**key invariants:**

- service worker is stateless (must rehydrate from storage on wake)
- alarms survive sw termination (reliable polling)
- side panel is reactive (no manual messaging needed)
- keywords are mandatory (empty keywords = zero hits)
- rate limits are passively inspected (no proactive prevention)

**pain points:**

- reddit api restrictions (no self-service keys → session piggybacking)
- sw lifecycle (termination after 30s → alarms + storage hydration)
- offscreen audio workaround (mv3 limitation)
- side panel requires chrome 114+

---

**context loaded. ready for instructions.**
