// debug utilities for testing system status
// run from devtools console: window.debugSystemStatus.setError()

import { STORAGE_KEYS } from '@utils/constants';
import type { SystemStatus } from '@/types/schemas';

/**
 * manually set system status for testing
 * usage in console: window.debugSystemStatus.setError('network timeout')
 */
export const debugSystemStatus = {
  /**
   * set idle state
   */
  async setIdle() {
    const status: SystemStatus = {
      status: 'idle',
      lastPollTimestamp: Date.now()
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.SYSTEM_STATUS]: status });
    console.log('[debug] status set to idle');
  },

  /**
   * set polling state
   */
  async setPolling() {
    const status: SystemStatus = {
      status: 'polling',
      startedAt: Date.now()
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.SYSTEM_STATUS]: status });
    console.log('[debug] status set to polling');
  },

  /**
   * set error state
   */
  async setError(message = 'simulated test error', code?: string) {
    const status: SystemStatus = {
      status: 'error',
      message,
      code,
      timestamp: Date.now()
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.SYSTEM_STATUS]: status });
    console.log('[debug] status set to error:', message);
  },

  /**
   * set rate limited state
   */
  async setRateLimited(retrySeconds = 60) {
    const status: SystemStatus = {
      status: 'ratelimited',
      retryTimestamp: Date.now() + (retrySeconds * 1000),
      message: `test rate limit, retry in ${retrySeconds}s`
    };
    await chrome.storage.local.set({ [STORAGE_KEYS.SYSTEM_STATUS]: status });
    console.log('[debug] status set to ratelimited, countdown:', retrySeconds);
  },

  /**
   * clear status from storage
   */
  async clear() {
    await chrome.storage.local.remove(STORAGE_KEYS.SYSTEM_STATUS);
    console.log('[debug] status cleared from storage');
  },

  /**
   * get current status from storage
   */
  async get() {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SYSTEM_STATUS);
    console.log('[debug] current status:', result[STORAGE_KEYS.SYSTEM_STATUS]);
    return result[STORAGE_KEYS.SYSTEM_STATUS];
  }
};

// expose to window for console access
if (typeof window !== 'undefined') {
  (window as any).debugSystemStatus = debugSystemStatus;
}
