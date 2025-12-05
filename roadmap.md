# Project Roadmap: Sxentrie (RedditHawk)

**Format:** Technical directives.
**Objective:** Chrome Extension (MV3). Real-time Reddit monitor.
**Design Standard:** Zinc/Void Monochromatic. Bento Grid.
**Code Standard:** **Svelte** (via Vite). Max 300 lines/file.

---

## Phase I: Infrastructure & Configuration

**Goal:** Establish the directory hierarchy, configuration files, and build targets.

1.  **Directory Initialization**

    - Implement strict folder structure defined in README.md (see `src/`, `assets/`, `styles/`).
    - Structure project for **Vite** (`root` vs `src`).
    - Verify no single directory contains unrelated file types (e.g., maintain strict separation of `ui/` vs `services/`).
    - Add **idb-keyval**, **ky**, **dompurify**, **svelte**, and **@sveltejs/vite-plugin-svelte** to dependencies.
    - **Dependency:** Add `svelte-check` (^4.0.0+). Explicitly required for Runes syntax validation (`$state`, `$props`).
    - **Remove:** External Manifest plugins (e.g., CRXJS). Incompatible with Svelte 5 HMR.
    - Create `src/types/schemas.js`: Export shared **Zod** definitions for `Hit` and `Config`.
    - **Directive:** Configure Vite/Svelte: Set `compilerOptions: { css: 'injected' }` to prevent conflict with Shadow DOM Manual Mount.
    - **HMR Safety:** Wrap all HMR-specific code in `if (import.meta.hot)` to ensure dead-code elimination in production.

    **Constraint:** **Manual Vite Configuration** (Multi-Entry):

    - Explicitly use `rollupOptions.input` for `background`, `content`, and `popup`.
    - Custom script to copy `manifest.json` to dist.
    - Disable standard HMR for content scripts.
    - Set `sourcemap: 'hidden'` or `false` for production to avoid `unsafe-eval` CSP violations.

2.  **Manifest Definition**

    - Create `manifest.json`.
    - Define permissions: `alarms`, `storage`, `offscreen`, `scripting`, `activeTab`, `notifications`.
    - Define host permissions: `https://www.reddit.com/r/*/new.json`, `https://oauth.reddit.com/*` (Scope strictly to necessary endpoints).
    - Register Service Worker: `src/background/index.js` (type: `module`).
    - Register Content Scripts: `src/content/index.js` (matches: `<all_urls>`, type: `module`).
    - Define Web Accessible Resources: `src/*`, `assets/*` (Required for ESM dynamic imports).

3.  **Global Styles & Design Tokens**
    - Create `styles/variables.css`. Define Zinc palette (`#09090b` to `#e4e4e7`).
    - Create `styles/reset.css`. Target Shadow DOM host specifically.
    - Create `styles/main.css`. Import variables and resets.
    - **Constraint:** Ensure Tailwind/styles are Shadow DOM compatible (use JIT mode or inline build).
    - **Constraint Check:** Ensure variables match "Zinc & Void" specifications (Zinc-950 backgrounds, Zinc-900/40% opacity glass).

**Validation:** Load unpacked extension in Chrome. Verify no errors in `chrome://extensions`.

---

## Phase II: The Brain (Ingestion Engine)

**Goal:** Functional Service Worker capable of fetching and parsing Reddit JSON without UI.

**Goal:** Functional Service Worker capable of fetching and parsing Reddit JSON without UI.

1.  **Zero-Phase: Identity & Onboarding** (BYOK Model)

    - **Requirement:** Mandate `chrome.identity.launchWebAuthFlow` using the `chromiumapp.org` pattern.
    - **Critical Constraint:** User **MUST** select **"Installed App"** when creating their Reddit App. Warn that "Script" or "Web App" types will fail.
    - **Header Rule:** Token Exchange **MUST** use `Authorization: Basic btoa(CLIENT_ID + ":")`. The trailing colon is mandatory.
    - **Storage:** Define logic for User `Client ID` (not a shared dev key).
    - **Constraint:** **Strictly Ban** "Implicit Grant". Enforce "Authorization Code" flow (Permanent Duration).

2.  **Utilities Implementation**

    - Create `src/utils/constants.js`: Define API endpoints, default polling intervals (30s), default subreddits.
    - Create `src/utils/logger.js`: Wrapper for console logging (toggleable).
    - Create `src/utils/logger.js`: Wrapper for console logging (toggleable).
    - Create `src/utils/hashing.js`: Implement **SHA-256** (via `crypto.subtle`) or **SimHash** on `normalized_title + author` for O(1) deduplication. **Remove** Levenshtein (O(N) cost too high).

3.  **Service Layer (Pure Logic)**

    - Create `src/services/reddit-api.js`: Implement `fetchSubredditBatch(subs)`. **Refactor:** Replace `fetch` with **ky**.
    - **Optimization:** **Dynamic URL Sizing**: Cap batch URL length at **2000 characters** (approx 40-50 subs) -> Maximize 100 QPM quota. Replace fixed "20 sub" limit.
    - **Constraint:** Implement **"Pool Rotation"** (cycle through these optimized groups).
    - **Constraint:** Implement **"Passive Header Inspection"** (Safety First):
      - Check `x-ratelimit-remaining` _after every request_.
      - IF `remaining < 5`: Immediately pause polling for `x-ratelimit-reset` seconds.
      - **DO NOT** wait for a 429 error.
      - IF `403/404`: Initiate **Binary Search Isolation** (Recursive split) to find poison.
    - Create `src/services/parser.js`: Transform raw Reddit JSON into standardized `Hit` objects.
    - **Validation:** **Generate Zod Schemas** directly mapped to Reddit API JSON paths (handling null flairs/crossposts) instead of ad-hoc checks. Fail gracefully.
    - Create `src/lib/storage.svelte.ts`: Abstraction over `chrome.storage.local` and `chrome.storage.session`.
    - **Strategy:** Adopt **ChromeStorageProxy** Pattern (Universal Reactivity):
      - Class-based state using private `$state` fields (Runes).
      - Auto-sync with `chrome.storage.onChanged`.
      - Expose reactive getters/setters to the UI.
      - **L1 Cache (Sync):** `Set<string>` in memory for O(1) deduplication checks.
      - **L2 Cache (Async):** `idb-keyval` (Historical Seen Set) + `storage.session` (Active State).
    - **Constraint:** Use `idb-keyval` for persistent "Seen Set" to avoid quota limits.
    - **Constraint:** Implement **Startup Hydration** (Load Set to L1 memory) and **Pruning** (Garbage collect > 24h on startup).

4.  **Background Orchestration**

    - Create `src/background/alarm-manager.js`: Setup recursive logic (Avoid standard interval). Check **"Quiet Hours"** before triggering audio (polling continues).
    - Create `src/background/poller.js`: Import API and Parser. Execute fetch loop.
    - **Constraint:** Implement **"Dynamic Header Factory"**:
      - Fetch User Identity via `/api/v1/me` on startup.
      - Construct UA: `chrome-extension:<id>:<version> (by /u/<username>)`.
      - **Blocker:** Block any network calls until this header is ready.
    - Create `src/background/poller.js`: Import API and Parser. Execute fetch loop.
    - **Constraint:** Implements **"Ping-Pong Keep-Alive"**:
      - **Ban** `setInterval` for long-running tasks.
      - **Logic:** Offscreen Document sends `KEEP_ALIVE` message to Background every 20s.
      - Background resets "Idle Timer" on receipt. If timeout -> restart Poller.
    - **Constraint:** Mandate **"Dead Man's Switch" (Heartbeat)**:
      - Poller writes `timestamp` to `storage.local` on every loop.
      - Alarm Manager checks `timestamp`. IF `now - timestamp > 2 mins` -> Assume Death -> Force Reset.
    - **Clarification:** `storage.session` for _active_ state, `storage.local` required for _lifecycle/persistence_.
    - **Constraint:** Poller must be **stateless**. Hydrate from `storage.session` at start, persist at end. No instance variables.
    - Create `src/background/index.js`: Import managers. Initialize listeners.

    4.  **Developer Tools**

    5.  **Developer Tools**

    - **Mock Server:** Create `src/utils/mock-api.js`. Intercept calls when `IS_DEBUG=true`. Test Rate Limits/Errors without live API.
    - **Chaos Monkey:** Randomly inject 429s and high-latency responses during debug mode to test resiliency.

**Validation:** Inspect Service Worker console. Verify JSON objects are fetched and logged every 60 seconds.

---

## Phase III: The Face (Overlay UI)

**Goal:** Inject the "HUD" into the DOM using the Bento/Archipelago design system.

1.  **Injector Logic**

    - Create `src/content/injector.js`:
      - **Manual Mount Strategy:**
        1. Create Host (`#reddithawk-host`).
        2. Attach Shadow (`mode: 'open'`).
        3. Construct `CSSStyleSheet` with inline Tailwind imports (Vite `?inline`).
        4. Mount Component: `mount(Component, { target: shadowRoot })`.
    - **Refactor:** Replace `new App({ target... })` with `mount()`.
    - **Constraint:** Implement **Event Trapping**. Stop propagation for `keydown`, `wheel`, and `mousedown` on the Shadow Host. Ensure Hotkeys are bound inside Shadow Root.
    - **Optimization:** Pre-load CSS as text resources in `src/content/index.js` before mounting.
    - **Directive:** **Shadow DOM Font Injection**:
      - Mandate injection of a `<style>` tag into Shadow Root.
      - Define `@font-face` using `chrome.runtime.getURL('assets/fonts/...')`.
      - **Reason:** Standard CSS imports fail to resolve relative font paths inside Shadow DOM.

2.  **Component Architecture (Bento Grid)**

    - Create `src/ui/components/HudContainer.svelte`: Main generic "Island" container. Apply `backdrop-filter: blur(4px)`.
    - Create `src/ui/components/FeedList.svelte`: Container for hit items.
    - Create `src/ui/components/Controls.svelte`: Play/Pause, Settings toggle buttons.
    - **Note:** Logic and View co-located in `.svelte` files. Use `<style>` blocks for scoped CSS.
    - **Constraint:** Ensure components are modular and use strict props.
    - **Dependency:** Enforce `bits-ui` (v1.0-next or higher).
    - **Syntax (Svelte 5):**
      - **Strictly Ban** `<slot>` elements. Mandate `{#snippet}` for all internal composition.
      - **Effect Safety:** **Strictly Ban** `async` functions directly inside `$effect`. Use `ChromeStorageProxy` for async state.
      - **Library Constraint:** For `bits-ui`, replace `asChild` with **Snippets** (`children` prop) and pass builders as arguments.
    - **Optimization:** Mandate **Strict Named Imports** for `lucide-svelte` (e.g., `import { Icon } ...`) to ensure tree-shaking.
    - **Props:** Update `HitCard` specs to use "Callback Props" (e.g., `onclick={onDismiss}`) instead of `createEventDispatcher`.

3.  **Hit Card Design**

    - Create `src/ui/components/HitCard.svelte`.
    - Layout: Compact grid.
    - Typography: `Inter` (12px) for content, `JetBrains Mono` (10px) for metadata (Subreddit/Author).
    - Styling: Zinc-800 borders, transparent backgrounds. Use scoped styling.

4.  **Content Entry Point**

    - Update `src/content/index.js`: Instantiate Injector. Mount `HudContainer`.

5.  **Onboarding Flow**
    - **Setup Wizard:** Step-by-step UI to guide users through creating a Reddit App (screenshots/links) and inputting Client ID.
    - Validation step to test the key before saving.

**Validation:** Open any webpage. Verify the floating "Island" appears. Verify it does not inherit styles from the host page (Shadow DOM isolation).

---

## Phase IV: The Nervous System (Wiring)

**Goal:** Connect the Brain (Background) to the Face (Content) and handle user input.

1.  **Message Bus**

    - Create `src/background/messager.js`: specific handler for `chrome.runtime.onMessage`.
    - **Logic:** Background pushes to an internal queue first (Mailbox Pattern).
    - Define message types in `constants.js`: `START_SCAN`, `STOP_SCAN`, `UPDATE_CONFIG`, `NEW_HIT`.

2.  **State Reactivity**

    - Update `src/content/bridge.js`: Listen for `chrome.runtime.onMessage`.
    - **Sync Logic:** UI (Content Script) requests sync on load/wake, OR Background waits for an `ack` from UI.
    - If no `ack`, message is queued as "Unread".
    - Implement "Unread Count" badge on the UI.

3.  **User Actions**
    - Implement "Snooze/Dismiss" logic in `hit-card.js`. Send ID to Background to add to "Seen" list.
    - **Constraint:** **Optimistic UI**. Remove Card from DOM **immediately** on click. Handle storage sync in background. Do not await storage write.
    - Implement "Drag" functionality for the HUD container (Must not rely on heavy libraries).

**Validation:** Manually trigger a mock hit in Background. Verify it appears instantly in the UI Overlay.

---

## Phase V: Intelligence & Filtering

**Goal:** Implement the "Sxentrie" specific logic (Include/Exclude/Poison).

1.  **Matching Engine**

    - Create `src/services/matcher.js`.
    - Implement `isMatch(text, keywords)`.
    - Implement `isPoison(text, poisonKeywords)`.
    - **Constraint:** **Double Sanitization**. Mandate `DOMPurify` execution inside the **Content Script** before rendering, in addition to Background sanitization.
    - Ensure Regex handling is safe.
    - **Constraint:** Wrap regex execution in `try-catch` with timeout limits OR utilize a safe library (e.g., `re2` or strictly bounded execution). Prevent "Catastrophic Backtracking" (ReDoS).

2.  **Filter Integration**

    - Update `src/background/poller.js`.
    - Pass parsed items through `Matcher`.
    - Only broadcast items that pass `Match` AND fail `Poison`.

3.  **Deduplication**
    - Update `src/background/poller.js`.
    - Check calculated Hash against `chrome.storage.session` "Seen" set.
    - Reject duplicates before broadcasting.
4.  **Simulation Mode**
    - Add a "Simulation Mode" tab to Settings.
    - **Mock Ingestor:** Input field for raw JSON linked to **Mock Server** logic.
    - **Requirement:** Inject pre-canned "Perfect Match" payloads into the **ENTIRE** pipeline (Poller -> Matcher -> Deduper -> Notification) to verify end-to-end latency and UI rendering.
5.  **Click-to-Block**
    - **UI:** Add "Block" action to `HitCard`.
    - **Logic:** Immediate addition to "Poison" list + re-scan of current feed to remove matches.

**Validation:** Add "test" to keywords. Post on a private subreddit or mock the API response. Verify "test" appears. Add "poison" to exclude. Verify post with "test poison" does not appear.

---

## Phase VI: The Voice & Expansion

**Goal:** Audio alerts and Smart Copy templates.

1.  **Offscreen Audio**

    - Create `src/offscreen/offscreen.html`.
    - Create `src/offscreen/audio-player.js`.
    - Update `src/background/index.js` to create offscreen document if not exists.
    - **Heartbeat Keeper:** Use Offscreen doc to send keep-alives during active monitoring.
    - **Lifecycle:** Implement **"Lazy Destruction"** / Keep-Alive. Initialize on first scan, keep alive while scanning. Terminate only on Stop/Close.
    - **Directive:** Implement **Heartbeat Emitter**: Send `KEEP_ALIVE` to Runtime on interval (Ping-Pong).
    - **Constraint:** Check `chrome.offscreen.hasDocument()` before sending messages.
    - Send `PLAY_SOUND` message from Background to Offscreen on new hit.

2.  **Smart Copy System**

    - Create `src/ui/templates/smart-copy.js`.
    - Implement string replacement: `Hello {{AUTHOR}}, I saw your post about {{TITLE}}...`
    - Attach to "Copy" button on `HitCard`.
    - **Constraint:** **Strict Input Sanitization**. Strip control chars, normalize Unicode, escape HTML if needed.

3.  **Settings Management**
    - Create `src/ui/components/settings-panel.js` (Another "Island").
    - Inputs for: Subreddits (comma separated), Keywords, Poison words.
    - **Feature:** **Context Profiles**. Allow saving/loading named sets of Subreddits + Keywords.
    - **Feature:** **Quiet Hours**. Inputs for Start Time and End Time.
    - Save to `chrome.storage.local`.

**Validation:** Full system test. Configure subs. Wait for hit. Hear audio. Click Copy. Paste into text editor to verify template.

4.  **Developer Tools**

    - Implement `Ctrl+Shift+H` (or similar) listener in Background or Content.
    - Action: Dump internal state (Config, Logs, Poller Status) to Clipboard.

5.  **External Integrations**
    - Update `Settings` to accept a `Webhook URL`.
    - Update `Background` to `POST` new hits to the URL.

---

## Phase VII: Optimization & Release Prep

**Goal:** Code audit and build artifact.

1.  **Linting & Constraints**

    - Audit all files. If > 300 lines, refactor into sub-modules in `src/utils` or `src/services`.
    - Verify all styling uses CSS Variables.
    - **Post-Build Sanity Check:**

      - Create script to grep `dist/` for `eval(`.
      - **FAIL** build if found (Critical for MV3 Store Compliance).

    - **Build & Minification**
    - usage of **Vite** for production build.

2.  **Assets**

    - Generate icons (`16`, `48`, `128`).
    - Compress audio files.

3.  **Final Polish**
    - Remove `console.log` (or disable via `logger.js`).
    - Zip `RedditHawk/` folder.

**End of Roadmap.**
