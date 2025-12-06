# system status testing guide

## quick start

### 1. load extension

```powershell
# build output is in /dist
# load unpacked extension from chrome://extensions
```

### 2. open side panel

- click extension icon
- side panel should open with feed/settings tabs

### 3. verify healthy state (default)

- **expected:** no banner visible (system is idle)
- **reason:** idle/polling states are hidden by default to minimize visual noise

## manual testing scenarios

### scenario 1: simulate network error

#### method 1: chrome devtools

1. open chrome devtools (F12)
2. navigate to **network tab**
3. set throttling dropdown to **offline**
4. wait for next poll cycle (~30s default)
5. **expected:** red banner appears with error message:
   ```
   Engine Stalled
   Failed to fetch
   ```
6. restore network (set to **no throttling**)
7. wait ~30s for next poll
8. **expected:** banner disappears after successful fetch

#### method 2: debug console

1. open side panel
2. open devtools for side panel (right-click → inspect)
3. run in console:
   ```javascript
   await window.debugSystemStatus.setError('network timeout', 'NETWORK_ERR');
   ```
4. **expected:** red banner appears immediately with custom message
5. clear status:
   ```javascript
   await window.debugSystemStatus.setIdle();
   ```

### scenario 2: simulate rate limit

#### method 1: aggressive polling (triggers real rate limit)

1. open settings panel
2. set polling interval to **10 seconds** (minimum)
3. add multiple active subreddits (5+)
4. wait 2-3 minutes for reddit api to throttle
5. **expected:** yellow banner appears with countdown timer:
   ```
   Rate Limited
   reddit api rate limit exceeded, retry in 60s
   [0:45]  ← countdown
   ```
6. **expected:** countdown decrements every second
7. **expected:** banner auto-hides when countdown reaches 0:00

#### method 2: debug console

1. open devtools console
2. run:
   ```javascript
   await window.debugSystemStatus.setRateLimited(30); // 30 second countdown
   ```
3. **expected:** yellow banner appears with 30s countdown
4. watch countdown decrement in real-time
5. wait for countdown to reach zero
6. **expected:** banner auto-hides

### scenario 3: verify write-on-change optimization

#### test write frequency

1. open chrome devtools → **application tab**
2. navigate to **storage → local storage → [extension-id]**
3. locate `systemStatus` key
4. watch value during normal operation
5. **expected behavior:**
   - value changes from `idle` → `polling` (1 write)
   - after fetch completes: `polling` → `idle` (1 write)
   - **subsequent polls:** no additional writes if state remains `idle`
   - **total writes per successful cycle:** 2 (not per-second spam)

#### verify cache mechanism

1. open background service worker devtools
2. run:
   ```javascript
   // in background context (not side panel)
   console.log(window.lastWrittenStatus);
   // should show: 'idle' or 'polling' or null
   ```
3. trigger multiple polls
4. confirm `lastWrittenStatus` prevents redundant writes

## debug console commands

open side panel devtools and run:

```javascript
// set idle state (healthy)
await window.debugSystemStatus.setIdle();

// set polling state (actively fetching)
await window.debugSystemStatus.setPolling();

// set error state
await window.debugSystemStatus.setError('custom error message', 'ERR_CODE');

// set rate limited (with custom countdown)
await window.debugSystemStatus.setRateLimited(120); // 2 minutes

// clear status from storage
await window.debugSystemStatus.clear();

// get current status
await window.debugSystemStatus.get();
```

## visual regression checklist

### red banner (error state)

- [ ] background: dark red with red border
- [ ] icon: alert circle (red)
- [ ] title: "Engine Stalled" (bold, lighter red)
- [ ] message: error text (darker red)
- [ ] code: optional, gray parenthetical
- [ ] positioning: between nav tabs and main content
- [ ] margins: consistent with feed cards below

### yellow banner (rate limit state)

- [ ] background: dark amber with amber border
- [ ] icon: clock (amber)
- [ ] title: "Rate Limited" (bold, lighter amber)
- [ ] message: descriptive text (darker amber)
- [ ] countdown: mm:ss format, tabular nums, right-aligned
- [ ] countdown updates: every 1 second
- [ ] auto-hide: when countdown reaches 0:00

### no banner (idle/polling)

- [ ] no element rendered (inspect dom, should not exist)
- [ ] no layout shift when banner appears/disappears
- [ ] no flicker during rapid state changes

## edge case verification

### service worker termination

1. open chrome://extensions
2. click "service worker" link for reddit hawk
3. in devtools console, run: `chrome.runtime.reload()`
4. open side panel
5. **expected:** banner rehydrates from storage if error/rate-limit persisted

### malformed status data

1. open application → local storage
2. manually edit `systemStatus` value to invalid json: `{corrupt}`
3. reload side panel
4. **expected:** no crash, `parseSystemStatus()` falls back to idle

### concurrent polls (busy lock)

1. set polling interval to 10s
2. simulate slow network (devtools → slow 3g)
3. observe multiple alarm triggers while first poll still running
4. **expected:** subsequent polls skip with "busy" log
5. **expected:** no duplicate status writes

### countdown edge cases

- [ ] countdown at exactly 0:00 → banner hides
- [ ] countdown with negative timestamp → shows 0:00
- [ ] countdown interrupted by new status → refreshes correctly
- [ ] countdown during tab switch → continues accurately

## expected log output

### healthy cycle

```
[poller] starting engine
[poller] fetching from 3 subs...
[poller] status updated: polling
[poller] received 25 total hits, seenIds: 0
[poller] persisted 2 matched hits to storage
[poller] status updated: idle
[poller] next poll scheduled in 30s
```

### error cycle

```
[poller] fetching from 3 subs...
[poller] status updated: polling
[poller] fetch failed: TypeError: Failed to fetch
[poller] status updated: error
[poller] retrying in 60s
```

### rate limit cycle

```
[poller] fetching from 3 subs...
[poller] status updated: polling
[poller] rate limited, sleeping for 60s
[poller] status updated: ratelimited
```

## acceptance criteria

- [✅] build completes without errors
- [ ] red banner displays on network errors
- [ ] yellow banner displays on rate limits
- [ ] countdown timer updates every second
- [ ] countdown auto-hides at zero
- [ ] idle/polling states do not render
- [ ] write-on-change prevents storage spam
- [ ] status persists across sw restarts
- [ ] no ui flicker during state transitions
- [ ] debug utilities work in dev console

## troubleshooting

### banner not appearing

1. check `chrome.storage.local` for `systemStatus` key
2. if missing, manually trigger status with debug console
3. verify `StatusBanner` is imported in `App.tsx`
4. check browser console for react errors

### countdown not updating

1. verify status is `ratelimited` (not `error`)
2. check `retryTimestamp` is in future (unix ms)
3. open console, should see no interval errors
4. try `setRateLimited(10)` for quick test

### storage writes too frequent

1. open application tab → local storage
2. watch `systemStatus` key during idle operation
3. should NOT change every poll cycle
4. if changing constantly, check `lastWrittenStatus` cache logic

### debug utilities not found

1. verify in **development mode** (`npm run dev`)
2. check side panel context (not background worker)
3. run: `console.log(window.debugSystemStatus)`
4. should return object with methods, not undefined
