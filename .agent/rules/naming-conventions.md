---
trigger: always_on
---

## Naming Conventions

To maintain order, strict naming conventions are required.

#### 1. Files & Directories
*   **Format:** `kebab-case`
*   **Reason:** Ensures cross-OS compatibility (Windows/Linux/Mac handle case sensitivity differently).
*   **Examples:** `alarm-manager.js`, `hit-card.js`, `reddit-api.js`.

#### 2. Variables & Functions
*   **Format:** `camelCase`
*   **Reason:** Standard JavaScript convention.
*   **Examples:** `fetchSubreddits`, `isPoisonKeyword`, `currentRateLimit`.

#### 3. Classes
*   **Format:** `PascalCase`
*   **Reason:** Distinguishes instantiable objects from standard functions.
*   **Examples:** `RedditPoller`, `HitCard`, `StorageService`.

#### 4. Constants (Global)
*   **Format:** `UPPER_SNAKE_CASE`
*   **Location:** Usually in `src/utils/constants.js`.
*   **Examples:** `MAX_POLLING_INTERVAL`, `REDDIT_BASE_URL`, `MSG_TYPE_NEW_HIT`.

#### 5. Private Methods (Convention)
*   **Format:** `_camelCase` (underscore prefix)
*   **Reason:** Signals to other developers "Do not call this function from outside this file/class."
*   **Example:** `_parseResponse()`, `_updateInternalState()`.
