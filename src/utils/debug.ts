// debug utilities
// exposes internal state to devtools console when IS_DEBUG=true

import { IS_DEBUG } from '@utils/constants';

/**
 * debug state interface
 */
export interface DebugState {
  configStore?: unknown;
  authState?: unknown;
  version?: string;
  [key: string]: unknown;
}

/**
 * augment global scope for typescript
 * works for both window (content) and self (service worker)
 */
declare global {
  interface Window {
    __SXENTRIE__?: DebugState;
  }
  // service worker global scope
  // eslint-disable-next-line no-var
  var __SXENTRIE__: DebugState | undefined;
}

/**
 * gets appropriate global object (window or self)
 */
function getGlobalThis(): typeof globalThis {
  if (typeof self !== 'undefined') return self;
  if (typeof window !== 'undefined') return window;
  return globalThis;
}

/**
 * mounts debug globals to window/self
 * strictly gated by IS_DEBUG - tree-shaken in production
 */
export function mountDebugGlobals(state: DebugState): void {
  if (!IS_DEBUG) return;

  const global = getGlobalThis() as typeof globalThis & { __SXENTRIE__?: DebugState };
  global.__SXENTRIE__ = state;

  console.log(
    '%c[sxentrie] debug mode enabled',
    'color: #71717a; font-weight: bold;'
  );
  console.log(
    '%cAccess internal state via: __SXENTRIE__',
    'color: #71717a;'
  );
}

/**
 * logs debug message (only in debug mode)
 */
export function debugLog(message: string, ...args: unknown[]): void {
  if (!IS_DEBUG) return;
  console.log(`[sxentrie] ${message}`, ...args);
}

/**
 * logs debug warning (only in debug mode)
 */
export function debugWarn(message: string, ...args: unknown[]): void {
  if (!IS_DEBUG) return;
  console.warn(`[sxentrie] ${message}`, ...args);
}

/**
 * logs debug error (always - errors are important)
 */
export function debugError(message: string, ...args: unknown[]): void {
  console.error(`[sxentrie] ${message}`, ...args);
}
