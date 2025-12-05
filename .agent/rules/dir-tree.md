---
trigger: always_on
---

## Folder Structure

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
│   ├── ui/                 # Visual Logic (DOM Manipulation)
│   │   ├── components/     # Specific UI parts
│   │   │   ├── hud-container.js  # The main draggable shell
│   │   │   ├── feed-list.js      # Manages the list of hits
│   │   │   ├── hit-card.js       # Generates HTML for one post
│   │   │   └── controls.js       # Toolbar buttons (Play/Pause/Settings)
│   │   └── templates/      # String literals or <template> logic
│   │       ├── smart-copy.js     # {{TITLE}} replacement logic
│   │       └── styles.js         # CSS injected via JS (if dynamic)
│   │
│   └── utils/              # Shared Helpers
│       ├── constants.js    # Global Config (Limits, defaults)
│       ├── formatting.js   # Date formatting, text truncation
│       ├── hashing.js      # Generates 'Author+Title' hash
│       └── logger.js       # Wrapper for console.log (for debug toggling)
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