// reddit poller
// alarm-based orchestration engine for fetching matches
// survives service worker termination via chrome.alarms

import { configStore } from '@lib/storage.svelte';
import { fetchSubredditBatch, RateLimitError } from '@services/reddit-api';
import { log } from '@utils/logger';
import { 
  DEFAULT_POLLING_INTERVAL, 
  MIN_POLLING_INTERVAL,
  ALARM_NAME,
  STORAGE_KEYS
} from '@utils/constants';

// runtime state (non-persisted)
let isRunning = false;
let consecutiveErrors = 0;

/**
 * loads seen IDs from session storage (preferred) or local storage (fallback)
 * returns empty set on error
 */
async function loadSeenIds(): Promise<Set<string>> {
  try {
    // prefer session storage (faster, cleared on browser restart)
    const storage = chrome.storage.session ?? chrome.storage.local;
    const result = await storage.get(STORAGE_KEYS.SEEN_SET);
    const ids = result[STORAGE_KEYS.SEEN_SET];
    
    if (Array.isArray(ids)) {
      return new Set(ids);
    }
  } catch (err) {
    log.poller.warn('failed to load seenIds:', err);
  }
  return new Set();
}

/**
 * saves seen IDs to session storage (preferred) or local storage (fallback)
 * limits to 1000 most recent to prevent unbounded growth
 */
async function saveSeenIds(ids: Set<string>): Promise<void> {
  try {
    const storage = chrome.storage.session ?? chrome.storage.local;
    // convert to array, limit size to prevent storage bloat
    const arr = Array.from(ids).slice(-1000);
    await storage.set({ [STORAGE_KEYS.SEEN_SET]: arr });
  } catch (err) {
    log.poller.warn('failed to save seenIds:', err);
  }
}

/**
 * calculates next delay with backoff (in minutes for alarms)
 */
function getBackoffMinutes(baseInterval: number): number {
  if (consecutiveErrors === 0) return baseInterval / 60;
  
  // exponential backoff: 30s -> 60s -> 120s -> 300s (cap)
  const backoffSeconds = Math.min(baseInterval * Math.pow(2, consecutiveErrors), 300);
  return backoffSeconds / 60;
}

/**
 * schedules next poll via chrome.alarms
 */
async function scheduleNextPoll(delayMinutes: number): Promise<void> {
  // chrome.alarms requires minimum 1 minute in production
  // but allows shorter in dev mode (we'll use Math.max to be safe)
  const safeDelay = Math.max(delayMinutes, 0.5); // 30 seconds minimum
  
  await chrome.alarms.create(ALARM_NAME.POLLER, {
    delayInMinutes: safeDelay
  });
  
  log.poller.debug(`next poll scheduled in ${(safeDelay * 60).toFixed(0)}s`);
}

/**
 * core polling function - called by alarm handler
 * loads state from storage, fetches, saves state back
 */
export async function poll(): Promise<void> {
  if (!isRunning) {
    log.poller.debug('poll called but not running, skipping');
    return;
  }

  // ensure config is hydrated (important after SW restart from alarm)
  await configStore.ready;

  const config = configStore.value;
  const subs = config.subreddits;
  const interval = Math.max(config.pollingInterval, MIN_POLLING_INTERVAL);

  if (!subs || subs.length === 0) {
    log.poller.info('no subreddits configured, sleeping...');
    await scheduleNextPoll(1); // check again in 1 minute
    return;
  }

  // load persisted seen IDs
  const seenIds = await loadSeenIds();
  log.poller.debug(`loaded ${seenIds.size} seen IDs from storage`);

  try {
    log.poller.info(`fetching from ${subs.length} subs...`);
    const hits = await fetchSubredditBatch(subs);
    consecutiveErrors = 0; // success resets backoff

    log.poller.info(`received ${hits.length} total hits, seenIds: ${seenIds.size}`);

    // collect unseen hits
    const newHits = hits.filter(hit => !seenIds.has(hit.id));
    
    // mark as seen
    for (const hit of newHits) {
      seenIds.add(hit.id);
    }

    // persist updated seen IDs
    await saveSeenIds(seenIds);

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
      
      log.poller.info(`broadcasted ${newHits.length} new hits to ${tabs.length} tabs`);
    }

    // schedule next normal poll
    await scheduleNextPoll(interval / 60);

  } catch (err) {
    if (err instanceof RateLimitError) {
      log.poller.warn(`rate limited, sleeping for ${err.resetTime}s`);
      await scheduleNextPoll(err.resetTime / 60);
      return;
    }

    consecutiveErrors++;
    log.poller.error('fetch failed', err);
    
    // schedule retry with backoff
    const delayMinutes = getBackoffMinutes(interval);
    log.poller.info(`retrying in ${(delayMinutes * 60).toFixed(0)}s`);
    await scheduleNextPoll(delayMinutes);
  }
}

/**
 * starts the polling engine
 * creates alarm instead of direct setTimeout
 */
export async function startPolling(): Promise<void> {
  if (isRunning) return;
  
  log.poller.info('starting engine');
  isRunning = true;
  consecutiveErrors = 0;
  
  // ensure config is loaded
  await configStore.ready;
  
  // run first poll immediately, then schedule subsequent via alarms
  await poll();
}

/**
 * stops the polling engine
 * clears the alarm
 */
export async function stopPolling(): Promise<void> {
  log.poller.info('stopping engine');
  isRunning = false;
  consecutiveErrors = 0;
  
  // clear the polling alarm
  await chrome.alarms.clear(ALARM_NAME.POLLER);
  log.poller.debug('alarm cleared');
}

/**
 * handles alarm events - called from index.ts
 */
export function handleAlarm(alarm: chrome.alarms.Alarm): void {
  if (alarm.name === ALARM_NAME.POLLER) {
    log.poller.debug('alarm fired, triggering poll');
    poll();
  }
}

/**
 * debug state
 */
export function getPollerDebugState() {
  return {
    get isRunning() { return isRunning; },
    get errorCount() { return consecutiveErrors; },
    async getSeenCount() { 
      const ids = await loadSeenIds();
      return ids.size;
    }
  };
}
