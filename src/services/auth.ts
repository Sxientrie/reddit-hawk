// auth service
// byok oauth flow with persistent token storage

import { IS_DEBUG } from '@utils/constants';

const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/authorize';
const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const REDIRECT_URL = `https://${chrome.runtime.id}.chromiumapp.org/`;

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'auth_accessToken',
  REFRESH_TOKEN: 'auth_refreshToken',
  TOKEN_EXPIRY: 'auth_tokenExpiry',
  CLIENT_ID: 'auth_clientId'
} as const;

/**
 * l1 cache (memory) - cleared on sw idle
 */
let memoryToken: string | null = null;
let memoryExpiry: number = 0;

/**
 * exposes l1 cache state for debugging
 * returns getter object - values are live references
 */
export function getAuthDebugState() {
  if (!IS_DEBUG) return null;
  return {
    get token() { return memoryToken ? `${memoryToken.slice(0, 8)}...` : null; },
    get expiry() { return memoryExpiry; },
    get expiresIn() { return memoryExpiry ? Math.round((memoryExpiry - Date.now()) / 1000) + 's' : 'n/a'; },
    get isValid() { return memoryToken !== null && Date.now() < memoryExpiry; }
  };
}

/**
 * generates mock token for development
 */
function getMockToken(): string {
  console.warn('[sxentrie] MOCK MODE: using fake token');
  return 'mock_token_' + Date.now().toString(36);
}

/**
 * builds oauth authorization url
 */
function buildAuthUrl(clientId: string, state: string): string {
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: 'code',
    state,
    redirect_uri: REDIRECT_URL,
    duration: 'permanent',
    scope: 'read identity'
  });
  return `${REDDIT_AUTH_URL}?${params}`;
}

/**
 * exchanges auth code for access token
 */
async function exchangeCodeForToken(
  clientId: string,
  code: string
): Promise<{ access_token: string; expires_in: number; refresh_token: string }> {
  const credentials = btoa(`${clientId}:`);

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: REDIRECT_URL
    })
  });

  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

/**
 * refreshes access token using stored refresh token
 */
async function refreshAccessToken(
  clientId: string,
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  const credentials = btoa(`${clientId}:`);

  const response = await fetch(REDDIT_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken
    })
  });

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

/**
 * persists token data to chrome.storage.local
 */
async function persistTokens(
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
  clientId: string
): Promise<void> {
  const expiry = Date.now() + (expiresIn * 1000);

  // update l1 cache
  memoryToken = accessToken;
  memoryExpiry = expiry;

  // persist to l2 storage
  await chrome.storage.local.set({
    [STORAGE_KEYS.ACCESS_TOKEN]: accessToken,
    [STORAGE_KEYS.REFRESH_TOKEN]: refreshToken,
    [STORAGE_KEYS.TOKEN_EXPIRY]: expiry,
    [STORAGE_KEYS.CLIENT_ID]: clientId
  });
}

/**
 * hydrates auth state from storage into memory
 * call on sw wake-up
 */
export async function hydrateAuth(): Promise<void> {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.TOKEN_EXPIRY
  ]);

  memoryToken = data[STORAGE_KEYS.ACCESS_TOKEN] ?? null;
  memoryExpiry = data[STORAGE_KEYS.TOKEN_EXPIRY] ?? 0;
}

/**
 * initiates oauth flow via chrome.identity
 * uses byok (user provides their own client id)
 */
export async function authenticate(clientId: string): Promise<string> {
  // mock mode for development
  if (IS_DEBUG) {
    const mockToken = getMockToken();
    await persistTokens(mockToken, 'mock_refresh', 3600, clientId);
    return mockToken;
  }

  const state = crypto.randomUUID();
  const authUrl = buildAuthUrl(clientId, state);

  // launch web auth flow
  const responseUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl,
    interactive: true
  });

  if (!responseUrl) {
    throw new Error('Auth flow cancelled');
  }

  // parse response
  const url = new URL(responseUrl);
  const code = url.searchParams.get('code');
  const returnedState = url.searchParams.get('state');

  if (returnedState !== state) {
    throw new Error('State mismatch - possible CSRF');
  }

  if (!code) {
    const error = url.searchParams.get('error');
    throw new Error(`Auth failed: ${error}`);
  }

  // exchange code for token
  const tokenData = await exchangeCodeForToken(clientId, code);

  await persistTokens(
    tokenData.access_token,
    tokenData.refresh_token,
    tokenData.expires_in,
    clientId
  );

  return tokenData.access_token;
}

/**
 * gets valid access token
 * decision tree: L1 Cache -> L2 Storage -> Refresh Flow
 */
export async function getToken(): Promise<string | null> {
  // mock mode
  if (IS_DEBUG) {
    if (!memoryToken) {
      const mockToken = getMockToken();
      await persistTokens(mockToken, 'mock_refresh', 3600, 'mock_client');
    }
    return memoryToken;
  }

  // L1: check memory cache
  if (memoryToken && Date.now() < memoryExpiry) {
    return memoryToken;
  }

  // L2: check storage
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.TOKEN_EXPIRY,
    STORAGE_KEYS.CLIENT_ID
  ]);

  const storedToken = data[STORAGE_KEYS.ACCESS_TOKEN];
  const storedExpiry = data[STORAGE_KEYS.TOKEN_EXPIRY] ?? 0;
  const refreshToken = data[STORAGE_KEYS.REFRESH_TOKEN];
  const clientId = data[STORAGE_KEYS.CLIENT_ID];

  // valid stored token
  if (storedToken && Date.now() < storedExpiry) {
    memoryToken = storedToken;
    memoryExpiry = storedExpiry;
    return storedToken;
  }

  // L3: refresh flow
  if (refreshToken && clientId) {
    try {
      const tokenData = await refreshAccessToken(clientId, refreshToken);
      await persistTokens(
        tokenData.access_token,
        refreshToken,
        tokenData.expires_in,
        clientId
      );
      return tokenData.access_token;
    } catch (err) {
      console.error('[sxentrie] token refresh failed:', err);
      await clearAuth();
      return null;
    }
  }

  return null;
}

/**
 * checks if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const token = await getToken();
  return token !== null;
}

/**
 * clears all auth state
 */
export async function clearAuth(): Promise<void> {
  memoryToken = null;
  memoryExpiry = 0;

  await chrome.storage.local.remove([
    STORAGE_KEYS.ACCESS_TOKEN,
    STORAGE_KEYS.REFRESH_TOKEN,
    STORAGE_KEYS.TOKEN_EXPIRY,
    STORAGE_KEYS.CLIENT_ID
  ]);
}
