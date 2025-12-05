// content script entry
// shadow dom mounter with adoptedStyleSheets

// import { mount } from 'svelte'; // phase iii
import { createFontStyleSheet, verifyFontsLoaded } from '@lib/fonts';
import { configStore } from '@lib/storage.svelte';
import { mountDebugGlobals, debugLog } from '@utils/debug';

// import css as inline strings for adoptedStyleSheets
import mainCSS from '../../styles/main.css?inline';

const HOST_ID = 'sxentrie-host';

/**
 * collects and reparents svelte-injected styles to shadow root
 * fallback for any styles that escape to document.head
 */
function reparentSvelteStyles(shadow: ShadowRoot): void {
  // find any svelte-injected styles in document.head
  const svelteStyles = document.head.querySelectorAll('style[data-svelte]');
  
  svelteStyles.forEach(style => {
    // clone and add to shadow
    const clone = style.cloneNode(true) as HTMLStyleElement;
    shadow.appendChild(clone);
    // remove from document.head
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
 * creates shadow root and mounts svelte app
 */
async function initOverlay(): Promise<void> {
  // prevent double injection
  if (document.getElementById(HOST_ID)) {
    debugLog('host already exists');
    return;
  }

  // mount debug globals (tree-shaken in production)
  mountDebugGlobals({
    configStore,
    version: '0.1.0'
  });

  // create host element
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    z-index: 2147483647;
    pointer-events: none;
  `;

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

  debugLog('shadow dom mounted');

  // verify fonts loaded (async, non-blocking)
  verifyFontsLoaded().catch(() => {
    debugLog('font verification failed - possible CSP block');
  });

  // reparent any svelte styles that escaped to document.head
  reparentSvelteStyles(shadow);

  // observe for future svelte style injections
  const observer = new MutationObserver(() => {
    reparentSvelteStyles(shadow);
  });
  observer.observe(document.head, { childList: true });

  // TODO: mount svelte component in phase iii
  // const app = mount(HudContainer, { target: appRoot });
  // reparentSvelteStyles(shadow); // reparent after mount
}

// init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => initOverlay());
} else {
  initOverlay();
}
