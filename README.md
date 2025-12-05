# Sxentrie (RedditHawk)

## 1. Project Overview

**Sxentrie** is a high-performance "First Responder" Chrome Extension for freelancers and agencies. It monitors Reddit in real-time for new posts matching specific criteria, enabling users to be the first to reply to opportunities.

Built for **speed and precision**: sub-minute polling, intelligent deduplication, and a floating HUD overlay that works on any webpage.

---

## 2. API Strategy: Session Piggybacking

### The Problem

As of late 2025, Reddit has severely restricted API access:

- **No Self-Service API Keys:** Applications for new API credentials are routinely rejected, even for research and non-profit use.
- **BYOK Not Viable:** The "Bring Your Own Key" model described in older documentation is no longer practical—most users cannot obtain a Client ID.
- **Rate Limits:** Official API requires OAuth tokens and caps usage at 100 QPM per Client ID.

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

| Layer | Technology |
|-------|------------|
| **UI Framework** | Svelte 5 (Runes) |
| **Build Tool** | Vite |
| **HTTP Client** | ky |
| **Validation** | Zod |
| **Styling** | Scoped CSS (Zinc/Void palette) |
| **State** | chrome.storage.local + reactive proxies |

**Extension APIs Used:**
- `chrome.alarms` – Scheduling
- `chrome.storage` – State persistence
- `chrome.scripting` – Programmatic content script injection
- `chrome.tabs` – Cross-tab messaging
- `Shadow DOM` – Style isolation from host pages

---

## 4. Core Features

### Real-Time Monitoring
- Polls configured subreddits every 30 seconds
- Uses multi-subreddit batching (`r/sub1+sub2+sub3/new.json`) for efficiency
- Passive rate limit inspection via response headers

### Intelligent Deduplication
- L1 Cache: In-memory `Set<string>` for O(1) lookups
- L2 Cache: Persisted hits in `chrome.storage.local`
- Prevents duplicate alerts even across browser restarts

### Floating Overlay (HUD)
- Injected via Shadow DOM (style-isolated)
- Toggle with extension icon click
- Persists state across tabs
- Glassmorphism "Zinc & Void" design

### Hit Cards
- Subreddit + Author + Timestamp
- Click to open post in new tab
- Dismiss button to remove from feed

---

## 5. Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    SXENTRIE ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────┐    broadcasts    ┌─────────────────┐   │
│  │   THE BRAIN     │ ──────────────▶  │   THE FACE      │   │
│  │ (Service Worker)│                  │ (Content Script) │   │
│  │                 │                  │                  │   │
│  │ • Poller        │                  │ • Shadow DOM     │   │
│  │ • Reddit API    │                  │ • Svelte Overlay │   │
│  │ • Deduplication │                  │ • Hit display    │   │
│  │ • Rate limiting │                  │ • User actions   │   │
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
npm run build -- --mode development

# 3. Load in Chrome
#    - Navigate to chrome://extensions/
#    - Enable "Developer mode"
#    - Click "Load unpacked"
#    - Select the `dist/` folder

# 4. Usage
#    - Click the Sxentrie icon to toggle the overlay
#    - Posts from r/webdev and r/freelance appear automatically
#    - Click a post to open it in a new tab
```

---

## 7. Configuration

Default monitored subreddits (defined in `src/lib/storage.svelte.ts`):

```typescript
subreddits: ['webdev', 'freelance']
```

To modify, edit the `configStore` default values and rebuild.

*Settings UI coming in Phase IV.*

---

## 8. File Structure

```
src/
├── background/          # Service Worker ("The Brain")
│   ├── index.ts         # Entry point, message handlers
│   └── poller.ts        # Fetch loop, deduplication
│
├── content/             # Content Script ("The Face")
│   └── index.ts         # Shadow DOM creation, overlay mount
│
├── services/            # Pure logic (no Chrome APIs)
│   ├── auth.ts          # Dummy guest mode service
│   ├── reddit-api.ts    # HTTP client (ky + session cookies)
│   └── parser.ts        # JSON → Hit transformation
│
├── ui/components/       # Svelte components
│   ├── Overlay.svelte   # Root component
│   ├── HudContainer.svelte
│   ├── FeedList.svelte
│   └── HitCard.svelte
│
├── lib/                 # Shared utilities
│   ├── storage.svelte.ts  # ChromeStorageProxy
│   └── fonts.ts         # Font loading
│
├── types/               # TypeScript definitions
│   └── schemas.ts       # Zod schemas for Hit, Config
│
└── utils/               # Helpers
    ├── constants.ts     # Global config
    ├── messager.ts      # Type-safe messaging
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

3. **Rate Limits:** ~10 QPM for unauthenticated, but session cookies may grant higher limits. Built-in circuit breaker prevents hitting limits.

4. **No Settings UI Yet:** Subreddit/keyword configuration requires code changes (Phase IV pending).

---

## 11. License

MIT
