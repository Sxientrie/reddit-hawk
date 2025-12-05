// auth service (dummy)
// mocked auth service to support 'guest mode' exclusively
// all users are treated as authenticated 'Guest'

import { IS_DEBUG } from '@utils/constants';

let memoryUsername: string | null = 'Guest';

/**
 * exposes l1 cache state for debugging
 * returns getter object - values are live references
 */
export function getAuthDebugState() {
  if (!IS_DEBUG) return null;
  return {
    get token() { return 'guest_mode'; },
    get expiry() { return Infinity; },
    get expiresIn() { return 'forever'; },
    get isValid() { return true; },
    get user() { return memoryUsername; }
  };
}

/**
 * hydrates auth state from storage into memory
 * no-op in guest mode
 */
export async function hydrateAuth(): Promise<void> {
  // no-op
}

/**
 * initiates oauth flow via chrome.identity
 * throws in guest mode
 */
export async function authenticate(clientId: string): Promise<string> {
  throw new Error('Authentication disabled in Guest Mode');
}

/**
 * gets valid access token
 * returns dummy in guest mode
 */
export async function getToken(): Promise<string | null> {
  return 'guest_token';
}

/**
 * gets authenticated username
 */
export function getUsername(): string | null {
  return memoryUsername;
}

/**
 * checks if user is authenticated
 * always true in guest mode
 */
export async function isAuthenticated(): Promise<boolean> {
  return true;
}

/**
 * clears all auth state
 * no-op in guest mode
 */
export async function clearAuth(): Promise<void> {
  // no-op
}
