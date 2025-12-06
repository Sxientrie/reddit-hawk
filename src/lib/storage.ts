// chrome storage hook
// react hook for chrome.storage with real-time sync

import { useState, useEffect, useCallback } from 'react';
import type { Config } from '@/types/schemas';

/**
 * react hook for chrome.storage.local with cross-tab sync
 * automatically updates when storage changes from other contexts
 */
export function useChromeStorage<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);

  // hydrate from storage on mount
  useEffect(() => {
    chrome.storage.local.get(key).then((result) => {
      if (result[key] !== undefined) {
        setValue(result[key]);
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });
  }, [key]);

  // listen for changes from other tabs/contexts
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area === 'local' && changes[key]) {
        setValue(changes[key].newValue);
      }
    };

    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [key]);

  // save to storage
  const save = useCallback(async (newValue: T) => {
    setValue(newValue);
    await chrome.storage.local.set({ [key]: newValue });
  }, [key]);

  // reset to default and clear storage
  const reset = useCallback(async () => {
    setValue(defaultValue);
    await chrome.storage.local.remove(key);
  }, [key, defaultValue]);

  return { value, isLoading, save, reset };
}

// default config shape
export const DEFAULT_CONFIG: Config = {
  subreddits: [],
  keywords: [],
  poisonKeywords: [],
  pollingInterval: 30,
  audioEnabled: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

/**
 * convenience hook specifically for config
 */
export function useConfig() {
  return useChromeStorage<Config>('config', DEFAULT_CONFIG);
}
