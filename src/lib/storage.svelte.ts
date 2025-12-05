// chrome storage proxy
// universal reactivity pattern for chrome.storage

import type { Config } from '@/types/schemas';

/**
 * ChromeStorageProxy
 * bridges async chrome.storage with svelte 5 runes.
 * implements L1 (memory) + L2 (chrome.storage) caching.
 */
export class ChromeStorageProxy<T> {
  #value = $state<T | undefined>(undefined);
  #initialized = $state(false);
  #key: string;

  constructor(key: string, defaultValue?: T) {
    this.#key = key;
    this.#init(defaultValue);
    this.#listen();
  }

  async #init(defaultValue?: T) {
    try {
      const result = await chrome.storage.local.get(this.#key);
      this.#value = result[this.#key] ?? defaultValue;
    } catch {
      this.#value = defaultValue;
    }
    this.#initialized = true;
  }

  #listen() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[this.#key]) {
        this.#value = changes[this.#key].newValue;
      }
    });
  }

  get value(): T | undefined {
    return this.#value;
  }

  get initialized(): boolean {
    return this.#initialized;
  }

  async set(newValue: T): Promise<void> {
    this.#value = newValue;
    await chrome.storage.local.set({ [this.#key]: newValue });
  }
}

// singleton instances
export const configStore = new ChromeStorageProxy<Config>('config');
