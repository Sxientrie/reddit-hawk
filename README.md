# Sxentrie (RedditHawk) - Overview

## 1. Project Title & Value Proposition

**Sxentrie** (codenamed RedditHawk) is a high-performance "First Responder" Chrome Extension designed for freelancers and agencies. It monitors Reddit in real-time for new posts matching specific criteria, enabling users to be the first to reply to potential opportunities.

Unlike standard RSS readers, Sxentrie is built for **speed and precision**, featuring sub-minute polling, intelligent deduplication, and a "Head-Up Display" (HUD) overlay that allows users to monitor opportunities without leaving their current workflow.

## 2. Technology Stack

The project is built on the **Chrome Manifest V3** architecture, utilizing modern web standards without heavy frameworks.

- **Core:** Svelte 5 (Runes) via Vite, JavaScript (ES Modules), HTML5.
- **UI Protocol:** `bits-ui` (v1.0-next+), Tailwind CSS (Zinc/Void).
- **Styling:** Scoped CSS (Svelte), Zinc Palette Variables.
- **Extension APIs:**
  - `chrome.alarms` (Scheduling)
  - `chrome.storage` (State Persistence)
  - `chrome.offscreen` (Audio Playback)
  - `chrome.scripting` & `chrome.activeTab` (Overlay Injection)
  - `chrome.notifications` (System Alerts)
  - `Shadow DOM` (Style Isolation)

## 3. Core Features

### Intelligent Scanning

- **Multi-Subreddit Polling:** Uses "Pool Rotation" to cycle through batches of 20 subreddits, minimizing API load.
- **Global Circuit Breaker:** Pauses ALL polling on 429s for the duration of the reset window. Only isolates (Binary Search) on 403/404s.
- **Rate Limit Compliance:** Dynamically adjusts polling intervals based on Reddit's `x-ratelimit-remaining` headers.

### Keyword Logic

- **Include/Exclude:** Supports mandatory keywords (e.g., "hiring", "budget") and "poison" keywords (e.g., "homework", "academic") to filter noise.
- **Regex Tester:** Built-in tool to verify keyword matching logic against sample text.

### Deduplication & State

- **Content Hashing:** Uses `SHA-256` or `SimHash` (O(1)) on `Title + Author` for highly efficient deduplication.
- **Hybrid Memory State:** Uses a Synchronous L1 Cache (Set) for O(1) lookups, backed by async `idb-keyval` (L2) for persistence.

### Security & Privacy

- **BYOK (Bring Your Own Key):** Operates on a "User-Owned Credentials" model. Users provide their own Reddit Client ID, ensuring data sovereignty and avoiding shared API quotas.
- **Dynamic User-Agent:** Constructs RFC-compliant headers (`chrome-extension:<id>:<version>`) based on authenticated user identity to prevent shadowbans.

### "First Responder" Tools

- **Floating Overlay:** A persistent, draggable Svelte app injected via Shadow DOM, strictly guarded against host page event leakage.
- **Smart Copy:** One-click copying with secure sanitization and dynamic templates (`{{AUTHOR}}`, `{{TITLE}}`).
- **Audio Alerts:** "Offscreen Ping-Pong" mechanism ensures the audio process stays alive during active scanning, bypassing browser throttling.

## 4. Architecture

The system follows a **Split-Brain Architecture** to comply with Manifest V3's ephemeral nature:

1.  **The Brain (Service Worker):**

    - Handles all business logic: fetching (via `ky`), parsing (via `zod`), and state management.
    - Runs on a **Recursive Chain** (Self-Healing).
    - **Hybrid State:** Universal Reactivity via `ChromeStorageProxy` (Svelte 5 Runes).
    - Single Source of Truth: All state mutations flow through shared reactive stores.

2.  **The Face:**

    - Responsible solely for rendering the UI (Svelte App).
    - Injects a Shadow DOM root (`#reddithawk-host`) and mounts the Svelte instance.
    - Communicates with the Brain via `chrome.runtime.sendMessage`.

3.  **The Voice (Offscreen - `offscreen.html`):**
    - A hidden document managed by a Keep-Alive lifecycle to play audio.

## 5. User Stories

- **The Video Editor:** "I want to monitor `r/editors` and `r/videography` for posts containing 'hiring' but exclude posts containing 'free' or 'exposure', so I only apply to paid gigs."
- **The Developer:** "I want to be notified immediately when a post matches my criteria, even if I'm browsing another site, so I can paste my 'Portfolio' template and send a DM within seconds."
- **The Agency:** "I want to export my configuration of 50+ niche subreddits and keywords to share with my team."

## 6. Use Cases

1.  **Freelance Lead Generation:** Monitoring `r/forhire`, `r/freelance_forhire`, and niche subs for job postings.
2.  **Market Research:** Tracking mentions of a brand or product across Reddit.
3.  **Arbitrage:** Spotting underpriced items on `r/hardwareswap` or `r/mechmarket`.

## 7. Folder Structure

```text
reddit-hawk/
├── assets/
│   ├── icons/              # .png items
│   └── audio/              # .mp3 alert sounds
│
├── src/
│   ├── background/         # "The Brain" (Service Worker)
│   │   ├── index.js        # Entry point (imports managers below)
│   │   ├── alarm-manager.js# Handles chrome.alarms schedule
│   │   ├── poller.js       # Orchestrates the fetching loop
│   │   └── messager.js     # Routes messages from Content Script
│   │
│   ├── content/            # "The Face" (UI Injection)
│   │   ├── index.js        # Entry point
│   │   ├── injector.js     # Shadow DOM creation & CSS injection
│   │   └── bridge.js       # Handles message passing to Background
│   │
│   ├── offscreen/          # "The Voice"
│   │   ├── audio-player.js # Logic to play sounds
│   │   └── offscreen.html  # Host file
│   │
│   ├── services/           # Pure Logic (No UI, No Chrome API if possible)
│   │   ├── reddit-api.js   # Raw HTTP fetching & Error handling
│   │   ├── parser.js       # JSON cleaning & deduplication logic
│   │   ├── matcher.js      # Keyword regex & poison filtering
│   │   └── storage.js      # Wrapper for chrome.storage (Session/Local)
│   │
│   ├── ui/                 # Visual Logic (Svelte Components)
│   │   ├── components/     # .svelte files
│   │   │   ├── HudContainer.svelte  # Main Island container
│   │   │   ├── FeedList.svelte      # Hit list
│   │   │   ├── HitCard.svelte       # Individual post
│   │   │   └── Controls.svelte      # Toolbar
│   │   └── templates/      # Helpers
│   │       └── smart-copy.js
│   │
│   └── utils/              # Shared Helpers
│       ├── constants.js    # Global Config (Limits, defaults)
│       ├── formatting.js   # Date formatting, text truncation
│       ├── hashing.js      # SHA-256 / SimHash logic
│       ├── mock-api.js     # DevEx: Mock Reddit API
│       └── logger.js       # Console wrapper
│
├── styles/                 # CSS (Zinc Palette)
│   ├── main.css            # Imports all others
│   ├── variables.css       # CSS Variables (Colors, Spacing)
│   ├── reset.css           # Shadow DOM resets
│   ├── overlay.css         # HUD positioning/animations
│   └── cards.css           # Styling for individual hits
│
├── manifest.json
└── README.md
```

## 8. Naming Conventions

To maintain order, strict naming conventions are required.

#### 1. Files & Directories

- **Format:** `kebab-case`
- **Reason:** Ensures cross-OS compatibility (Windows/Linux/Mac handle case sensitivity differently).
- **Examples:** `alarm-manager.js`, `hit-card.js`, `reddit-api.js`.

#### 2. Variables & Functions

- **Format:** `camelCase`
- **Reason:** Standard JavaScript convention.
- **Examples:** `fetchSubreddits`, `isPoisonKeyword`, `currentRateLimit`.

#### 3. Classes

- **Format:** `PascalCase`
- **Reason:** Distinguishes instantiable objects from standard functions.
- **Examples:** `RedditPoller`, `HitCard`, `StorageService`.

#### 4. Constants (Global)

- **Format:** `UPPER_SNAKE_CASE`
- **Location:** Usually in `src/utils/constants.js`.
- **Examples:** `MAX_POLLING_INTERVAL`, `REDDIT_BASE_URL`, `MSG_TYPE_NEW_HIT`.

#### 5. Private Methods (Convention)

- **Format:** `_camelCase` (underscore prefix)
- **Reason:** Signals to other developers "Do not call this function from outside this file/class."
- **Example:** `_parseResponse()`, `_updateInternalState()`.

## 9. Setup & Installation

2.  Run `npm install` to grab Svelte/Vite dependencies.
3.  Run `npm run dev` (or `build`).
4.  Open Chrome and navigate to `chrome://extensions/`.
5.  Enable **Developer mode**.
6.  Click **Load unpacked**.
7.  Select the `dist/` folder (or relevant build output).
8.  Click the extension icon in the toolbar to toggle the overlay.
