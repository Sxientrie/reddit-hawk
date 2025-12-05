// background service worker entry
// handles chrome.alarms, polling, and message routing

import { hydrateAuth } from '@services/auth';
import { onMessage, type LogEntry } from '@utils/messager';
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

  console.log('[sxentrie] service worker ready');
}

// run initialization
init();
