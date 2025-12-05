<script lang="ts">
  import type { Hit } from '@/types/schemas';
  import HitCard from './HitCard.svelte';

  const { hits = [], onDismiss } = $props<{ 
    hits: Hit[];
    onDismiss?: (id: string) => void;
  }>();
</script>

<div class="feed-container">
  {#if hits.length === 0}
    <div class="feed-empty">
      <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <path d="m4.93 4.93 14.14 14.14"/>
      </svg>
      <span>NO SIGNAL</span>
    </div>
  {:else}
    {#each hits as hit (hit.id)}
      <HitCard {hit} {onDismiss} />
    {/each}
  {/if}
</div>

<style>
  .feed-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 420px;
    overflow-y: auto;
    overflow-x: hidden;
    padding-right: 4px;
  }

  .feed-container::-webkit-scrollbar {
    width: 4px;
  }

  .feed-container::-webkit-scrollbar-track {
    background: transparent;
  }

  .feed-container::-webkit-scrollbar-thumb {
    background: #27272a;
    border-radius: 4px;
  }

  .feed-container::-webkit-scrollbar-thumb:hover {
    background: #3f3f46;
  }

  .feed-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 40px 20px;
    color: #52525b;
    opacity: 0.6;
  }

  .feed-empty span {
    font-family: ui-monospace, monospace;
    font-size: 11px;
    letter-spacing: 0.05em;
  }
</style>
