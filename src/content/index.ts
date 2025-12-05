// content script entry
// shadow dom mounter with adoptedStyleSheets

import { mount } from 'svelte';
import { createFontStyleSheet, verifyFontsLoaded } from '@lib/fonts';
import { configStore } from '@lib/storage.svelte';
import { mountDebugGlobals, debugLog } from '@utils/debug';
import Overlay from '@ui/components/Overlay.svelte';

// import css as inline strings for adoptedStyleSheets
import mainCSS from '../../styles/main.css?inline';

const HOST_ID = 'sxentrie-host';
let hostElement: HTMLDivElement | null = null;
let isVisible = false;
let isInitialized = false;

console.log('[sxentrie] content script loaded');

/**
 * listen for toggle message from background
 * MUST be registered immediately, before any async work
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  console.log('[sxentrie] received message:', message.type);
  if (message.type === 'TOGGLE_OVERLAY') {
    toggleOverlay();
    sendResponse({ success: true });
  }
  return true;
});

/**
 * collects and reparents svelte-injected styles to shadow root
 */
function reparentSvelteStyles(shadow: ShadowRoot): void {
  const svelteStyles = document.head.querySelectorAll('style[data-svelte]');
  
  svelteStyles.forEach(style => {
    const clone = style.cloneNode(true) as HTMLStyleElement;
    shadow.appendChild(clone);
    style.remove();
  });
}

/**
 * creates constructable stylesheet from css text
 */
function createStyleSheet(css: string): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  return sheet;
}

/**
 * toggles overlay visibility
 */
function toggleOverlay(): void {
  console.log('[sxentrie] toggle called, initialized:', isInitialized, 'visible:', isVisible);
  
  // lazy init if not done yet
  if (!isInitialized) {
    initOverlay();
  }
  
  if (!hostElement) {
    console.log('[sxentrie] no host element');
    return;
  }
  
  isVisible = !isVisible;
  hostElement.style.display = isVisible ? 'block' : 'none';
  console.log('[sxentrie] overlay now', isVisible ? 'visible' : 'hidden');
}

/**
 * creates shadow root and mounts svelte app
 */
function initOverlay(): void {
  // prevent double injection
  if (document.getElementById(HOST_ID)) {
    console.log('[sxentrie] host already exists');
    hostElement = document.getElementById(HOST_ID) as HTMLDivElement;
    isInitialized = true;
    return;
  }

  console.log('[sxentrie] initializing overlay...');

  try {
    // mount debug globals (tree-shaken in production)
    mountDebugGlobals({
      configStore,
      version: '0.1.0'
    });

    // create host element (hidden by default)
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

    // attach shadow root
    const shadow = host.attachShadow({ mode: 'open' });

    // create stylesheets
    const fontSheet = createFontStyleSheet();
    const mainSheet = createStyleSheet(mainCSS);

    // adopt stylesheets (fonts first for priority)
    shadow.adoptedStyleSheets = [fontSheet, mainSheet];

    // create mount target
    const appRoot = document.createElement('div');
    appRoot.id = 'app';
    appRoot.style.pointerEvents = 'auto';
    shadow.appendChild(appRoot);

    // append host to body
    document.body.appendChild(host);

    // event trapping - prevent host page interference
    host.addEventListener('keydown', e => e.stopPropagation(), true);
    host.addEventListener('wheel', e => e.stopPropagation(), true);
    host.addEventListener('mousedown', e => e.stopPropagation(), true);

    console.log('[sxentrie] shadow dom mounted');

    // verify fonts loaded (async, non-blocking)
    verifyFontsLoaded().catch(() => {
      console.log('[sxentrie] font verification failed');
    });

    // reparent any svelte styles
    reparentSvelteStyles(shadow);

    // observe for future svelte style injections
    const observer = new MutationObserver(() => {
      reparentSvelteStyles(shadow);
    });
    observer.observe(document.head, { childList: true });

    // mount svelte overlay component
    mount(Overlay, { target: appRoot });
    reparentSvelteStyles(shadow);
    
    isInitialized = true;
    console.log('[sxentrie] initialization complete');
  } catch (err) {
    console.error('[sxentrie] initialization error:', err);
  }
}

console.log('[sxentrie] content script ready, waiting for messages');
