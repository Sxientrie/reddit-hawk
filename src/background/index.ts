// background service worker entry
// handles chrome.alarms, polling, and message routing

import { hydrateAuth } from '@services/auth';

/**
 * initialize service worker
 * hydrates state from storage before processing
 */
async function init(): Promise<void> {
  console.log('[sxentrie] service worker initializing...');

  // hydrate auth state from storage (sw may have been idle)
  await hydrateAuth();

  console.log('[sxentrie] service worker ready');
}

// run initialization
init();

// placeholder - will import managers in phase ii
