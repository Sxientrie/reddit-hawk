// background service worker entry
// handles chrome.alarms, polling, and message routing

import { hydrateAuth, getAuthDebugState } from '@services/auth';
import { onMessage, type LogEntry } from '@utils/messager';
import { mountDebugGlobals } from '@utils/debug';
import { IS_DEBUG } from '@utils/constants';

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

  // placeholder handlers for phase ii
  onMessage('KEEP_ALIVE', () => {
    // reset idle timer
  });

  // icon click -> inject content script and toggle overlay
  chrome.action.onClicked.addListener(async (tab) => {
    console.log('[sxentrie] icon clicked, tab:', tab.id, tab.url);
    if (!tab.id || !tab.url) {
      console.log('[sxentrie] no tab id or url');
      return;
    }
    
    // skip chrome:// and edge:// pages
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
      console.log('[sxentrie] cannot inject into browser pages');
      return;
    }

    try {
      // try to send message first (content script may already be loaded)
      await chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_OVERLAY' });
      console.log('[sxentrie] message sent to existing content script');
    } catch {
      // content script not loaded, inject it
      console.log('[sxentrie] injecting content script...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['assets/content.js']
        });
        console.log('[sxentrie] content script injected, sending toggle...');
        // wait a bit for script to initialize
        setTimeout(async () => {
          try {
            await chrome.tabs.sendMessage(tab.id!, { type: 'TOGGLE_OVERLAY' });
            console.log('[sxentrie] toggle sent after injection');
          } catch (e) {
            console.log('[sxentrie] failed to send toggle after injection:', e);
          }
        }, 100);
      } catch (e) {
        console.log('[sxentrie] failed to inject:', e);
      }
    }
  });
}

/**
 * initialize service worker
 * hydrates state from storage before processing
 */
async function init(): Promise<void> {
  console.log('[sxentrie] service worker initializing...');

  // register message handlers first
  registerHandlers();

  // hydrate auth state from storage (sw may have been idle)
  await hydrateAuth();

  // remote logging handler (debug mode only to save bandwidth)
  mountDebugGlobals({
    get authState() { return getAuthDebugState(); },
    version: '0.1.0'
  });

  console.log('[sxentrie] service worker ready');
}

// run initialization
init();
