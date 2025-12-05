// content script entry
// shadow dom mounter with adoptedStyleSheets

import { mount } from 'svelte';
import { createFontStyleSheet, verifyFontsLoaded } from '@lib/fonts';
import { configStore } from '@lib/storage.svelte';
import { mountDebugGlobals } from '@utils/debug';
import Overlay from '@ui/components/Overlay.svelte';
import { log } from '@utils/logger';

// import css as inline strings for adoptedStyleSheets
import mainCSS from '../../styles/main.css?inline';

// ============================================================
// GLOBAL GUARD - prevents multiple executions on re-injection
// ============================================================
declare global {
  interface Window {
    __SXENTRIE_LOADED__?: boolean;
  }
}

// check for duplicate injection
const isAlreadyLoaded = window.__SXENTRIE_LOADED__ && !import.meta.hot;

if (isAlreadyLoaded) {
  log.ui.info('content script already loaded, skipping initialization');
} else {
  // mark as loaded
  window.__SXENTRIE_LOADED__ = true;
  
  // run initialization
  bootstrap();
}

// ============================================================
// BOOTSTRAP - all side effects wrapped here
// ============================================================
function bootstrap() {
  const HOST_ID = 'sxentrie-host';
  let hostElement: HTMLDivElement | null = null;
  let isVisible = false;
  let isInitialized = false;

  log.ui.info('content script loaded');

  // register message listener immediately
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    log.ui.debug('received message:', message.type);
    if (message.type === 'TOGGLE_OVERLAY') {
      toggleOverlay();
      sendResponse({ success: true });
    }
    return true;
  });

  log.ui.info('content script ready, waiting for messages');

  // --------------------------------------------------------
  // HELPER FUNCTIONS
  // --------------------------------------------------------

  function reparentSvelteStyles(shadow: ShadowRoot): void {
    const svelteStyles = document.head.querySelectorAll('style[data-svelte]');
    svelteStyles.forEach(style => {
      const clone = style.cloneNode(true) as HTMLStyleElement;
      shadow.appendChild(clone);
      style.remove();
    });
  }

  function createStyleSheet(css: string): CSSStyleSheet {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(css);
    return sheet;
  }

  function toggleOverlay(): void {
    log.ui.debug('toggle called, initialized:', isInitialized, 'visible:', isVisible);
    
    if (!isInitialized) {
      initOverlay();
    }
    
    if (!hostElement) {
      log.ui.warn('no host element');
      return;
    }
    
    isVisible = !isVisible;
    hostElement.style.display = isVisible ? 'block' : 'none';
    log.ui.info('overlay now', isVisible ? 'visible' : 'hidden');
  }

  function initOverlay(): void {
    // prevent double injection
    if (document.getElementById(HOST_ID)) {
      log.ui.debug('host already exists');
      hostElement = document.getElementById(HOST_ID) as HTMLDivElement;
      isInitialized = true;
      return;
    }

    log.ui.info('initializing overlay...');

    try {
      mountDebugGlobals({
        configStore,
        version: '0.1.0'
      });

      const host = document.createElement('div');
      host.id = HOST_ID;
      host.style.cssText = `
        position: fixed;
        top: 12px;
        right: 12px;
        left: auto;
        z-index: 2147483647;
        pointer-events: none;
        display: none;
        max-width: calc(100vw - 24px);
      `;
      hostElement = host;

      const shadow = host.attachShadow({ mode: 'open' });

      const fontSheet = createFontStyleSheet();
      const mainSheet = createStyleSheet(mainCSS);
      shadow.adoptedStyleSheets = [fontSheet, mainSheet];

      const appRoot = document.createElement('div');
      appRoot.id = 'app';
      appRoot.style.pointerEvents = 'auto';
      shadow.appendChild(appRoot);

      document.body.appendChild(host);

      // event trapping
      host.addEventListener('keydown', e => e.stopPropagation(), true);
      host.addEventListener('wheel', e => e.stopPropagation(), true);
      host.addEventListener('mousedown', e => e.stopPropagation(), true);

      log.ui.debug('shadow dom mounted');

      verifyFontsLoaded().catch(() => {
        log.ui.warn('font verification failed');
      });

      reparentSvelteStyles(shadow);

      const observer = new MutationObserver(() => {
        reparentSvelteStyles(shadow);
      });
      observer.observe(document.head, { childList: true });

      mount(Overlay, { target: appRoot });
      reparentSvelteStyles(shadow);
      
      isInitialized = true;
      log.ui.info('initialization complete');
    } catch (err) {
      log.ui.error('initialization error:', err);
    }
  }
}
