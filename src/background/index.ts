// background service worker entry
// handles chrome.alarms, polling, and message routing

import { hydrateAuth, getAuthDebugState, isAuthenticated } from '@services/auth';
import { getApiDebugState } from '@services/reddit-api';
import { startPolling, stopPolling, getPollerDebugState, handleAlarm } from './poller';
import { onMessage, type LogEntry } from '@utils/messager';
import { mountDebugGlobals } from '@utils/debug';
import { IS_DEBUG } from '@utils/constants';
import { log } from '@utils/logger';
import type { Hit } from '@/types/schemas';

/**
 * formats log entry for console output
 */
function formatRemoteLog(entry: LogEntry, sender: chrome.runtime.MessageSender): void {
  const prefix = `[Remote:${entry.source}]`;
  const tabInfo = sender.tab?.id ? ` (tab:${sender.tab.id})` : '';
  const fullPrefix = `${prefix}${tabInfo}`;

  const args: unknown[] = [fullPrefix, entry.message];
  if (entry.context !== undefined) {
    args.push(entry.context);
  }

  switch (entry.level) {
    case 'error':
      console.error(...args);
      break;
    case 'warn':
      console.warn(...args);
      break;
    default:
      console.log(...args);
  }
}

/**
 * registers message handlers
 */
function registerHandlers(): void {
  // remote logging handler (debug mode only to save bandwidth)
  if (IS_DEBUG) {
    onMessage('LOG_ENTRY', (payload, sender) => {
      formatRemoteLog(payload, sender);
    });
  }

  // scan control handlers
  onMessage('START_SCAN', () => {
    startPolling();
  });

  onMessage('STOP_SCAN', () => {
    stopPolling();
  });

  onMessage('UPDATE_CONFIG', async (config) => {
    // configStore updates automatically via messaging elsewhere or direct storage set
    // but if we receive this, we might want to manually refresh if needed
    // for now, poller picks up changes on next loop
  });

  // placeholder handlers for phase ii
  onMessage('KEEP_ALIVE', () => {
    // reset idle timer
  });

  // dismiss hit handler (single writer for hits cache)
  onMessage('DISMISS_HIT', async (payload) => {
    const STORAGE_KEY = 'sxentrie_hits_cache';
    const MAX_CACHED_HITS = 100;
    
    try {
      // load current cache
      const result = await chrome.storage.local.get(STORAGE_KEY);
      const currentHits: Hit[] = result[STORAGE_KEY] || [];
      
      // filter out dismissed hit
      const filtered = currentHits.filter((hit) => hit.id !== payload.id);
      
      // persist atomically
      await chrome.storage.local.set({ 
        [STORAGE_KEY]: filtered.slice(0, MAX_CACHED_HITS) 
      });
      
      log.bg.debug(`dismissed hit ${payload.id}, ${filtered.length} remain`);
    } catch (err) {
      log.bg.warn('failed to dismiss hit:', err);
    }
  });

  // alarm handler - routes alarms to appropriate handlers
  chrome.alarms.onAlarm.addListener((alarm) => {
    log.bg.debug('alarm fired:', alarm.name);
    handleAlarm(alarm);
  });

  // icon click -> open side panel
  // note: with sidePanel.setPanelBehavior, clicking the icon automatically opens the panel
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    .then(() => log.bg.debug('side panel behavior set'))
    .catch((err) => log.bg.warn('failed to set side panel behavior:', err));
}

/**
 * initialize service worker
 * hydrates state from storage before processing
 */
async function init(): Promise<void> {
  log.bg.info('service worker initializing...');

  // register message handlers first
  registerHandlers();

  // hydrate auth state from storage (sw may have been idle)
  await hydrateAuth();

  // remote logging handler (debug mode only to save bandwidth)
  mountDebugGlobals({
    get authState() { return getAuthDebugState(); },
    get apiState() { return getApiDebugState(); },
    get pollerState() { return getPollerDebugState(); },
    version: '0.1.0'
  });

  const authed = await isAuthenticated();
  if (authed) {
    log.bg.info('user authenticated, starting poller...');
    startPolling();
  } else {
    log.bg.info('waiting for authentication');
  }

  log.bg.info('service worker ready');
}

// run initialization
init();
