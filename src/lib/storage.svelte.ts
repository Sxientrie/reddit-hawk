// chrome storage proxy
// universal reactivity pattern for chrome.storage

import type { Config } from '@/types/schemas';

/**
 * ChromeStorageProxy
 * bridges async chrome.storage with svelte 5 runes.
 * implements L1 (memory) + L2 (chrome.storage) caching.
 */
export class ChromeStorageProxy<T> {
  #value: T;
  #initialized = $state(false);
  #dirty = $state(false); // tracks if set() was called before hydration
  #key: string;
  #readyPromise: Promise<void>;

  constructor(key: string, defaultValue: T) {
    this.#key = key;
    this.#value = $state(defaultValue); // safe default immediately
    this.#readyPromise = this.#hydrate(defaultValue);
    this.#listen();
  }

  async #hydrate(defaultValue: T): Promise<void> {
    try {
      const result = await chrome.storage.local.get(this.#key);

      // race condition guard: don't overwrite if user called set() during hydration
      if (!this.#dirty) {
        this.#value = result[this.#key] ?? defaultValue;
      }
    } catch {
      // keep default value on error (already set in constructor)
    }
    this.#initialized = true;
  }

  /**
   * shallow equality check via json stringify
   * sufficient for serializable config objects
   */
  #isEqual(a: T, b: T): boolean {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return a === b;
    }
  }

  #listen() {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'local' && changes[this.#key]) {
        const newValue = changes[this.#key].newValue as T;

        // skip update if value is identical (prevents redundant reactive cycles)
        if (!this.#isEqual(this.#value, newValue)) {
          this.#value = newValue;
        }
      }
    });
  }

  /** awaitable init - use before rendering ui */
  get ready(): Promise<void> {
    return this.#readyPromise;
  }

  /** current value - always defined (uses default until hydrated) */
  get value(): T {
    return this.#value;
  }

  /** reactive check for svelte templates */
  get initialized(): boolean {
    return this.#initialized;
  }

  /** update value - marks dirty to prevent hydration overwrite */
  async set(newValue: T): Promise<void> {
    this.#dirty = true;
    this.#value = newValue;
    await chrome.storage.local.set({ [this.#key]: newValue });
  }

  /** reset to default and clear storage */
  async reset(defaultValue: T): Promise<void> {
    this.#dirty = false;
    this.#value = defaultValue;
    await chrome.storage.local.remove(this.#key);
  }
}

// singleton instances with safe defaults
export const configStore = new ChromeStorageProxy<Config>('config', {
  subreddits: ['webdev', 'freelance'],
  keywords: [],
  poisonKeywords: [],
  pollingInterval: 30,
  audioEnabled: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
});
