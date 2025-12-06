# Sxentrie (RedditHawk)

## 1. Project Overview

**Sxentrie** is a high-performance "First Responder" Chrome Extension for freelancers and agencies. It monitors Reddit in real-time for new posts matching specific criteria, enabling users to be the first to reply to opportunities.

Built for **speed and precision**: sub-minute polling, intelligent deduplication, and a persistent Side Panel that stays open across all your tabs.

---

## 2. API Strategy: Session Piggybacking

### The Problem

As of late 2025, Reddit has severely restricted API access:

- **No Self-Service API Keys:** Applications for new API credentials are routinely rejected, even for research and non-profit use.

### The Solution: "Rogue Mode"

Sxentrie uses **Session Piggybacking** instead of formal API authentication:

```
┌─────────────────────────────────────────────────────────────┐
│  USER'S BROWSER                                             │
│  ┌─────────────┐     ┌─────────────────┐                    │
│  │ Reddit Tab  │     │ Sxentrie Ext.   │                    │
│  │ (Logged In) │────▶│ Service Worker  │                    │
│  └─────────────┘     └────────┬────────┘                    │
│        │                      │                             │
│   Cookies shared              │ fetch() with                │
│   via browser                 │ credentials: 'include'      │
│        │                      ▼                             │
│        └──────────────▶ reddit.com/r/.../new.json           │
└─────────────────────────────────────────────────────────────┘
```

**How it works:**

1. User logs into Reddit normally in their browser
2. Extension fetches public `.json` endpoints (`www.reddit.com/r/subreddit/new.json`)
3. Browser automatically attaches Reddit session cookies (no API key needed)
4. Extension receives authenticated-user treatment from Reddit's perspective

**Benefits:**

- ✅ No API key required
- ✅ No OAuth flow to implement
- ✅ Uses existing browser session
- ✅ Rate limits are per-session, not per-app

**Limitations:**

- ⚠️ User must be logged into Reddit in the browser
- ⚠️ If Reddit changes cookie policies, this may break
- ⚠️ Not suitable for server-side or headless deployments

---

## 3. Technology Stack

Built on **Chrome Manifest V3** architecture:

| Layer            | Technology                         |
| ---------------- | ---------------------------------- |
| **UI Framework** | React 18 + TypeScript              |
| **Styling**      | Tailwind CSS v4                    |
| **Build Tool**   | Vite                               |
| **HTTP Client**  | ky                                 |
| **Validation**   | Zod                                |
| **State**        | React hooks + chrome.storage.local |

**Extension APIs Used:**

- `chrome.sidePanel` – Persistent side panel UI
- `chrome.alarms` – Reliable polling schedule
- `chrome.storage` – State persistence
- `chrome.tabs` – Cross-tab messaging
- `chrome.offscreen` – Audio playback

---

## 4. Core Features

### Real-Time Monitoring

- Polls configured subreddits at your chosen interval (10-300 seconds)
- Uses multi-subreddit batching (`r/sub1+sub2+sub3/new.json`) for efficiency
- Passive rate limit inspection via response headers

### Intelligent Deduplication

- L1 Cache: `Set<string>` in `chrome.storage.session` for O(1) lookups
- L2 Cache: Persisted hits in `chrome.storage.local`
- Prevents duplicate alerts even across browser restarts

### Chrome Side Panel (v0.1.1+)

- **Persistent:** Stays open when switching tabs
- **Native:** Chrome UI element, not injected into pages
- **Clean:** No ghost overlays after extension reload
- **Tabbed:** Feed and Settings in one panel

### Hit Cards

- Subreddit + Author + Timestamp
- Click to open post in new tab
- Dismiss button to remove from feed

### Full Configuration

- Add/remove subreddits (comma-separated)
- Include keywords (match posts containing these terms)
- Exclude keywords (filter out unwanted posts)
- Adjustable polling interval
- Audio notification toggle

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SXENTRIE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    broadcasts    ┌─────────────────┐   │
│  │   THE BRAIN     │ ──────────────▶  │   THE FACE      │   │
│  │ (Service Worker)│                  │  (Side Panel)   │   │
│  │                 │                  │                  │   │
│  │ • Poller        │                  │ • Svelte App     │   │
│  │ • Reddit API    │                  │ • Feed List      │   │
│  │ • Deduplication │                  │ • Settings Panel │   │
│  │ • Rate limiting │                  │ • Hit Cards      │   │
│  └────────┬────────┘                  └──────────────────┘   │
│           │                                                  │
│           │ persists                                         │
│           ▼                                                  │
│  ┌─────────────────┐                                         │
│  │ chrome.storage  │                                         │
│  │ • Config        │                                         │
│  │ • Cached hits   │                                         │
│  │ • Seen IDs      │                                         │
│  └─────────────────┘                                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 6. Setup & Installation

### Prerequisites

- Node.js 18+
- Chrome/Edge browser
- Logged into Reddit in your browser

### Steps

```bash
# 1. Clone and install
git clone <repo>
cd reddit-hawk
npm install

# 2. Build for development
npm run build

# 3. Load in Chrome
#    - Navigate to chrome://extensions/
#    - Enable "Developer mode"
#    - Click "Load unpacked"
#    - Select the `dist/` folder

# 4. Usage
#    - Click the Sxentrie icon to open the Side Panel
#    - Go to Settings tab
#    - Add your subreddits (e.g., "webdev, freelance, forhire")
#    - Optionally add keywords and poison keywords
#    - Click Save
#    - Switch to Feed tab to see matching posts
```

---

## 7. Configuration

All configuration is done through the **Settings** tab in the Side Panel:

| Setting        | Description                                      |
| -------------- | ------------------------------------------------ |
| **Subreddits** | Comma-separated list of subreddits to monitor    |
| **Include**    | Keywords that posts must contain (optional)      |
| **Exclude**    | Poison keywords that filter out posts (optional) |
| **Interval**   | Polling interval in seconds (10-300)             |
| **Audio**      | Toggle notification sounds on/off                |

Settings are persisted to `chrome.storage.local` and survive browser restarts.

---

## 8. File Structure

```
src/
├── background/          # Service Worker ("The Brain")
│   ├── index.ts         # Entry point, message handlers
│   ├── poller.ts        # Fetch loop, deduplication
│   └── audio-manager.ts # Offscreen audio control
│
├── sidepanel/           # Chrome Side Panel ("The Face")
│   ├── index.html       # Entry HTML
│   ├── main.tsx         # React mount
│   └── App.tsx          # Root component
│
├── services/            # Pure logic (no Chrome APIs)
│   ├── auth.ts          # Dummy guest mode service
│   ├── reddit-api.ts    # HTTP client (ky + session cookies)
│   ├── parser.ts        # JSON → Hit transformation
│   └── matcher.ts       # Keyword filtering
│
├── ui/components/       # React components
│   ├── FeedList.tsx
│   ├── HitCard.tsx
│   └── SettingsPanel.tsx
│
├── lib/                 # Shared utilities
│   ├── storage.ts       # React hooks for chrome.storage
│   └── fonts.ts         # Font loading
│
├── types/               # TypeScript definitions
│   └── schemas.ts       # Zod schemas for Hit, Config
│
├── offscreen/           # Audio playback document
│   ├── offscreen.html
│   └── audio-player.ts
│
└── utils/               # Helpers
    ├── constants.ts     # Global config
    ├── messager.ts      # Type-safe messaging
    ├── logger.ts        # Console logging
    └── debug.ts         # Debug utilities
```

---

## 9. Development

```bash
# Type check
npm run check

# Lint
npm run lint

# Format
npm run format

# Build (production)
npm run build
```

---

## 10. Known Limitations

1. **Requires Reddit Login:** User must be logged into Reddit in the browser for session piggybacking to work.

2. **Public Endpoints Only:** Cannot access private subreddits or user-specific feeds without formal OAuth.

3. **Rate Limits:** ~100 requests per 10 minutes with session cookies. Built-in circuit breaker prevents hitting limits.

4. **Side Panel Support:** Requires Chrome 114+ for Side Panel API.

---

## 11. Changelog

### v0.2.0 (Current)

- **Major:** Migrated from Svelte to React 18 + TypeScript
- Added Tailwind CSS v4 for styling
- Simplified storage layer with React hooks
- Removed content script (Side Panel only)
- Framework-agnostic background poller

### v0.1.1

- **Major:** Migrated from content script overlay to Chrome Side Panel
- Eliminated ghost overlay issues when extension reloads
- Settings UI fully functional (subreddits, keywords, interval)
- Removed hardcoded default subreddits (user must configure)
- Panel persists across tab switches
- Improved UI with tabbed navigation

### v0.1.0

- Initial release
- Session piggybacking authentication
- Real-time polling
- Floating overlay UI (Svelte + Shadow DOM)
- Deduplication
- Audio notifications

---

## 12. License

MIT
