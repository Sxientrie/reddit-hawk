// reddit poller
// alarm-based orchestration engine for fetching matches
// survives service worker termination via chrome.alarms

import { fetchSubredditBatch, RateLimitError } from '@services/reddit-api';
import { filterHits } from '@services/matcher';
import { playNotificationSound } from './audio-manager';
import { log } from '@utils/logger';
import { 
  DEFAULT_POLLING_INTERVAL, 
  MIN_POLLING_INTERVAL,
  ALARM_NAME,
  STORAGE_KEYS
} from '@utils/constants';
import type { Config } from '@/types/schemas';

// default config
const DEFAULT_CONFIG: Config = {
  subreddits: [],
  keywords: [],
  poisonKeywords: [],
  pollingInterval: 30,
  audioEnabled: true,
  quietHours: { enabled: false, start: '22:00', end: '08:00' }
};

// runtime state (non-persisted)
let isRunning = false;
let consecutiveErrors = 0;
let isBusy = false; // concurrency lock - prevents overlapping poll executions

/**
 * loads config from chrome.storage.local
 */
async function loadConfig(): Promise<Config> {
  try {
    const result = await chrome.storage.local.get('config');
    return result.config ?? DEFAULT_CONFIG;
  } catch {
    return DEFAULT_CONFIG;
  }
}

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

  // check-and-set: prevent concurrent executions
  if (isBusy) {
    log.poller.debug('skipping poll: busy');
    return;
  }

  // acquire lock
  isBusy = true;

  try {
    // load config from storage
    const config = await loadConfig();
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
      const unseenHits = hits.filter(hit => !seenIds.has(hit.id));
      
      // apply keyword filters (include/exclude)
      const matchedHits = filterHits(unseenHits, config);
      
      // mark ALL unseen as seen (even filtered ones, to avoid re-checking)
      for (const hit of unseenHits) {
        seenIds.add(hit.id);
      }

      // persist updated seen IDs
      await saveSeenIds(seenIds);

      // broadcast matched hits to side panel
      if (matchedHits.length > 0) {
        // send to side panel via runtime messaging
        for (const hit of matchedHits) {
          chrome.runtime.sendMessage({ type: 'NEW_HIT', payload: hit }).catch(() => {});
        }
        
        log.poller.info(`broadcasted ${matchedHits.length} matched hits`);
        
        // play notification sound if enabled
        if (config.audioEnabled) {
          playNotificationSound('notification');
        }
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
  } finally {
    // release lock - guaranteed to run even if errors occur or sw terminates
    isBusy = false;
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
    get isBusy() { return isBusy; },
    get errorCount() { return consecutiveErrors; },
    async getSeenCount() { 
      const ids = await loadSeenIds();
      return ids.size;
    }
  };
}
