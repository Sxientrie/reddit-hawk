<script lang="ts">
  import type { Hit } from '@/types/schemas';
  import { formatDistanceToNow } from 'date-fns';

  const { hit, onDismiss } = $props<{ 
    hit: Hit 
    onDismiss?: (id: string) => void 
  }>();

  function handleDismiss(e: MouseEvent) {
    e.stopPropagation();
    onDismiss?.(hit.id);
  }

  function handleOpen() {
    window.open(`https://www.reddit.com${hit.permalink}`, '_blank');
  }

  // format time relative to now
  const timeAgo = $derived(
    formatDistanceToNow(new Date(hit.created_utc * 1000), { addSuffix: true })
      .replace('about ', '')
      .replace('less than a minute', 'now')
  );
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<article 
  class="hit-card"
  role="button"
  tabindex="0"
  onclick={handleOpen}
>
  <!-- Header: Subreddit + Author + Time -->
  <header class="hit-header">
    <div class="hit-meta">
      <span class="hit-sub">r/{hit.subreddit}</span>
      <span class="hit-author">u/{hit.author}</span>
    </div>
    <time class="hit-time">{timeAgo}</time>
  </header>

  <!-- Content: Title -->
  <h3 class="hit-title">{hit.title}</h3>

  <!-- Dismiss Button -->
  <button 
    class="hit-dismiss"
    onclick={handleDismiss}
    title="Dismiss"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
    </svg>
  </button>
</article>

<style>
  .hit-card {
    position: relative;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 10px 12px;
    background: rgba(39, 39, 42, 0.4);
    border: 1px solid rgba(63, 63, 70, 0.5);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s ease, border-color 0.15s ease;
    overflow: hidden;
  }

  .hit-card:hover {
    background: rgba(39, 39, 42, 0.6);
    border-color: rgba(82, 82, 91, 0.6);
  }

  .hit-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  .hit-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    flex: 1;
    overflow: hidden;
  }

  .hit-sub {
    font-family: ui-monospace, monospace;
    font-size: 10px;
    font-weight: 600;
    color: #10b981;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .hit-author {
    font-family: ui-monospace, monospace;
    font-size: 10px;
    color: #71717a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .hit-time {
    font-family: ui-monospace, monospace;
    font-size: 9px;
    color: #52525b;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .hit-title {
    font-size: 12px;
    font-weight: 500;
    line-height: 1.4;
    color: #e4e4e7;
    margin: 0;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    word-break: break-word;
  }

  .hit-card:hover .hit-title {
    color: #fff;
  }

  .hit-dismiss {
    position: absolute;
    top: 6px;
    right: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    background: #27272a;
    border: 1px solid #3f3f46;
    border-radius: 50%;
    color: #71717a;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
  }

  .hit-card:hover .hit-dismiss {
    opacity: 1;
  }

  .hit-dismiss:hover {
    background: rgba(127, 29, 29, 0.5);
    color: #f87171;
    border-color: #7f1d1d;
  }
</style>
