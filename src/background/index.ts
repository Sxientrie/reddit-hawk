// background service worker entry
// handles chrome.alarms, polling, and message routing

import { hydrateAuth, getAuthDebugState, isAuthenticated } from '@services/auth';
import { getApiDebugState } from '@services/reddit-api';
import { startPolling, stopPolling, getPollerDebugState } from './poller';
import { onMessage, type LogEntry } from '@utils/messager';
import { mountDebugGlobals } from '@utils/debug';
import { IS_DEBUG } from '@utils/constants';
import { log } from '@utils/logger';

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

  // icon click -> inject content script and toggle overlay
  chrome.action.onClicked.addListener(async (tab) => {
    log.bg.info('icon clicked, tab:', tab.id, tab.url);
    if (!tab.id || !tab.url) {
      log.bg.debug('no tab id or url');
      return;
    }
    
    // skip chrome:// and edge:// pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      log.bg.debug('cannot inject into browser pages');
      return;
    }

    try {
      // try to send message first (content script may already be loaded)
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' });
      log.bg.info('message sent to existing content script');
    } catch {
      // content script not loaded, inject it
      log.bg.info('injecting content script...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['assets/content.js']
        });
        log.bg.info('content script injected, sending toggle...');
        // wait a bit for script to initialize
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id!, { type: 'TOGGLE_OVERLAY' });
            log.bg.info('toggle sent after injection');
          } catch (e) {
            log.bg.error('failed to send toggle after injection:', e);
          }
        }, 100);
      } catch (e) {
        log.bg.error('failed to inject:', e);
      }
    }
  });
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
