// status indicator
// minimal visual cue for background poller health
// positioned in header as small colored dot (no text)

import { useState, useEffect } from 'react';
import { parseSystemStatus } from '@/types/schemas';
import type { SystemStatus } from '@/types/schemas';
import { STORAGE_KEYS } from '@utils/constants';

export function StatusIndicator() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  // hydrate from storage and setup reactive listener
  useEffect(() => {
    // initial hydration
    chrome.storage.local.get(STORAGE_KEYS.SYSTEM_STATUS).then((result) => {
      if (result[STORAGE_KEYS.SYSTEM_STATUS]) {
        const parsed = parseSystemStatus(result[STORAGE_KEYS.SYSTEM_STATUS]);
        setStatus(parsed);
      }
    }).catch(() => {
      // silent fail - no status is valid (healthy default)
    });

    // listen for storage changes
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === 'local' && changes[STORAGE_KEYS.SYSTEM_STATUS]) {
        const newStatus = changes[STORAGE_KEYS.SYSTEM_STATUS].newValue;
        if (newStatus) {
          const parsed = parseSystemStatus(newStatus);
          setStatus(parsed);
        }
      }
    };

    chrome.storage.onChanged.addListener(storageListener);
    return () => chrome.storage.onChanged.removeListener(storageListener);
  }, []);

  // idle or polling - green pulsing dot (healthy)
  if (!status || status.status === 'idle' || status.status === 'polling') {
    return (
      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="Healthy" />
    );
  }

  // error state - red solid dot
  if (status.status === 'error') {
    return (
      <div 
        className="w-2 h-2 bg-red-500 rounded-full" 
        title={`Error: ${status.message}`}
      />
    );
  }

  // rate limit state - yellow pulsing dot
  if (status.status === 'ratelimited') {
    return (
      <div 
        className="w-2 h-2 bg-amber-500 rounded-full animate-pulse" 
        title={status.message}
      />
    );
  }

  return null;
}
