<script lang="ts">
  import { onMount } from 'svelte';
  import HudContainer from './HudContainer.svelte';
  import FeedList from './FeedList.svelte';
  import type { Hit } from '@/types/schemas';

  const STORAGE_KEY = 'sxentrie_hits_cache';
  const MAX_CACHED_HITS = 100;

  let hits = $state<Hit[]>([]);
  let isLoading = $state(true);

  // persist hits to storage whenever they change
  async function saveHits() {
    try {
      await chrome.storage.local.set({ [STORAGE_KEY]: hits.slice(0, MAX_CACHED_HITS) });
    } catch {
      // silent fail
    }
  }

  function handleDismiss(id: string) {
    hits = hits.filter((h) => h.id !== id);
    saveHits();
  }

  function addHit(hit: Hit) {
    // prevent duplicates
    if (hits.some((h) => h.id === hit.id)) return;

    // prepend new hit
    hits = [hit, ...hits];

    // limit to 50 visible
    if (hits.length > 50) {
      hits = hits.slice(0, 50);
    }

    saveHits();
  }

  onMount(async () => {
    // hydrate from storage first
    try {
      const result = await chrome.storage.local.get(STORAGE_KEY);
      if (result[STORAGE_KEY] && Array.isArray(result[STORAGE_KEY])) {
        hits = result[STORAGE_KEY].slice(0, 50);
      }
    } catch {
      // start fresh
    }
    isLoading = false;

    // listen for new hits from background poller
    const listener = (
      message: { type: string; payload?: unknown },
      _sender: chrome.runtime.MessageSender,
      _sendResponse: (response?: unknown) => void
    ) => {
      if (message.type === 'NEW_HIT' && message.payload) {
        addHit(message.payload as Hit);
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  });
</script>

<HudContainer>
  <header class="overlay-header">
    <div class="overlay-status">
      <span class="status-dot"></span>
      <h1 class="status-title">SXENTRIE</h1>
    </div>
    <div class="overlay-count">
      <span class="count-value">{hits.length}</span>
      <span class="count-label">HITS</span>
    </div>
  </header>

  {#if isLoading}
    <div class="loading">Loading...</div>
  {:else}
    <FeedList {hits} onDismiss={handleDismiss} />
  {/if}
</HudContainer>

<style>
  .overlay-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px 10px 2px;
    border-bottom: 1px solid rgba(39, 39, 42, 0.5);
    margin-bottom: 10px;
  }

  .overlay-status {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-dot {
    width: 6px;
    height: 6px;
    background: #10b981;
    border-radius: 50%;
    box-shadow: 0 0 8px rgba(16, 185, 129, 0.6);
    animation: pulse 2s ease-in-out infinite;
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .status-title {
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.15em;
    color: #a1a1aa;
    margin: 0;
  }

  .overlay-count {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }

  .count-value {
    font-family: ui-monospace, monospace;
    font-size: 12px;
    font-weight: 600;
    color: #e4e4e7;
  }

  .count-label {
    font-family: ui-monospace, monospace;
    font-size: 9px;
    color: #52525b;
    letter-spacing: 0.05em;
  }

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
    color: #52525b;
    font-size: 11px;
    font-family: ui-monospace, monospace;
  }
</style>
