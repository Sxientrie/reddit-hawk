<script lang="ts">
  let { children } = $props();
</script>

<main class="hud-shell">
  <div class="hud-content">
    {@render children()}
  </div>
</main>

<style>
  .hud-shell {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 320px;
    max-height: 520px;
    background: rgba(9, 9, 11, 0.92);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(39, 39, 42, 0.6);
    border-radius: 12px;
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.3),
      0 4px 6px -1px rgba(0, 0, 0, 0.2),
      0 12px 24px -4px rgba(0, 0, 0, 0.4);
    overflow: hidden;
    font-family:
      system-ui,
      -apple-system,
      sans-serif;
    font-size: 13px;
    color: #e4e4e7;
    -webkit-font-smoothing: antialiased;
  }

  .hud-content {
    padding: 12px;
    overflow: hidden;
  }
</style>
