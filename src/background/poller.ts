// reddit poller
// orchestration engine for fetching matches

import { configStore } from '@lib/storage.svelte';
import { fetchSubredditBatch, RateLimitError } from '@services/reddit-api';
import { debugLog, debugWarn, debugError } from '@utils/debug';
import { DEFAULT_POLLING_INTERVAL, MIN_POLLING_INTERVAL } from '@utils/constants';

let isRunning = false;
let pollingTimer: ReturnType<typeof setTimeout> | null = null;
let consecutiveErrors = 0;

// L1 cache for seen IDs to prevent duplicate broadcasts
// cleared on service worker restart (which is fine for now, L2 coming later)
const seenIds = new Set<string>();

/**
 * calculates next delay with backoff
 */
function getNextDelay(baseInterval: number): number {
  if (consecutiveErrors === 0) return baseInterval * 1000;
  
  // exponential backoff: 30s -> 60s -> 120s -> 300s (cap)
  const backoff = Math.min(baseInterval * Math.pow(2, consecutiveErrors), 300);
  return backoff * 1000;
}

/**
 * core polling loop
 */
async function poll() {
  if (!isRunning) return;

  const config = configStore.value;
  const subs = config.subreddits;
  const interval = Math.max(config.pollingInterval, MIN_POLLING_INTERVAL);

  if (!subs || subs.length === 0) {
    debugLog('poller: no subreddits configured, sleeping...');
    pollingTimer = setTimeout(poll, 60000); // check again in 1m
    return;
  }

  try {
    debugLog(`poller: fetching from ${subs.length} subs...`);
    const hits = await fetchSubredditBatch(subs);
    consecutiveErrors = 0; // success resets backoff

    debugLog(`poller: received ${hits.length} total hits, seenIds: ${seenIds.size}`);

    // collect unseen hits
    const newHits = hits.filter(hit => !seenIds.has(hit.id));
    
    // mark as seen
    for (const hit of newHits) {
      seenIds.add(hit.id);
    }

    // broadcast new hits to all tabs
    if (newHits.length > 0) {
      const tabs = await chrome.tabs.query({});
      
      for (const hit of newHits) {
        for (const tab of tabs) {
          if (tab.id) {
            chrome.tabs.sendMessage(tab.id, { type: 'NEW_HIT', payload: hit }).catch(() => {});
          }
        }
      }
      
      debugLog(`poller: broadcasted ${newHits.length} new hits to ${tabs.length} tabs`);
    }

    // schedule next normal poll
    pollingTimer = setTimeout(poll, interval * 1000);

  } catch (err) {
    if (err instanceof RateLimitError) {
      debugWarn(`poller: rate limited, sleeping for ${err.resetTime}s`);
      pollingTimer = setTimeout(poll, (err.resetTime + 1) * 1000);
      return;
    }

    consecutiveErrors++;
    debugError('poller: fetch failed', err);
    
    // schedule retry with backoff
    const delay = getNextDelay(interval);
    debugLog(`poller: retrying in ${delay / 1000}s`);
    pollingTimer = setTimeout(poll, delay);
  }
}

/**
 * starts the polling engine
 */
export function startPolling() {
  if (isRunning) return;
  
  debugLog('poller: starting engine');
  isRunning = true;
  consecutiveErrors = 0;
  
  // ensure config is loaded
  configStore.ready.then(() => {
    poll();
  });
}

/**
 * stops the polling engine
 */
export function stopPolling() {
  debugLog('poller: stopping engine');
  isRunning = false;
  if (pollingTimer) {
    clearTimeout(pollingTimer);
    pollingTimer = null;
  }
}

/**
 * debug state
 */
export function getPollerDebugState() {
  return {
    get isRunning() { return isRunning; },
    get errorCount() { return consecutiveErrors; },
    get seenCount() { return seenIds.size; }
  };
}
