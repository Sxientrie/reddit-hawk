// content script entry
// shadow dom mounter with adoptedStyleSheets

// import { mount } from 'svelte'; // phase iii
import { createFontStyleSheet } from '@lib/fonts';

// import css as inline string for adoptedStyleSheets
import mainCSS from '../../styles/main.css?inline';

const HOST_ID = 'sxentrie-host';

/**
 * creates shadow root and mounts svelte app
 */
function initOverlay(): void {
  // prevent double injection
  if (document.getElementById(HOST_ID)) {
    console.log('[sxentrie] host already exists');
    return;
  }

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
  const mainSheet = new CSSStyleSheet();
  mainSheet.replaceSync(mainCSS);

  const fontSheet = createFontStyleSheet();

  // adopt stylesheets
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

  // TODO: mount svelte component in phase iii
  // mount(HudContainer, { target: appRoot });
}

// init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initOverlay);
} else {
  initOverlay();
}
