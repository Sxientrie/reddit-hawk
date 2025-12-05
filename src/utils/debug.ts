// debug utilities
// exposes internal state to devtools console when IS_DEBUG=true

import { IS_DEBUG } from '@utils/constants';

/**
 * debug state interface
 */
export interface DebugState {
  configStore?: unknown;
  authState?: unknown;
  [key: string]: unknown;
}

/**
 * augment window for typescript
 */
declare global {
  interface Window {
    __SXENTRIE__?: DebugState;
  }
}

/**
 * mounts debug globals to window
 * strictly gated by IS_DEBUG - tree-shaken in production
 */
export function mountDebugGlobals(state: DebugState): void {
  if (!IS_DEBUG) return;

  window.__SXENTRIE__ = state;

  console.log(
    '%c[sxentrie] debug mode enabled',
    'color: #71717a; font-weight: bold;'
  );
  console.log(
    '%cAccess internal state via: window.__SXENTRIE__',
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
