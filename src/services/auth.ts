// auth service
// byok oauth flow with mock mode for development

import { IS_DEBUG } from '@utils/constants';

const REDDIT_AUTH_URL = 'https://www.reddit.com/api/v1/authorize';
const REDDIT_TOKEN_URL = 'https://www.reddit.com/api/v1/access_token';
const REDIRECT_URL = `https://${chrome.runtime.id}.chromiumapp.org/`;

/**
 * auth state stored in memory
 */
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

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
 * initiates oauth flow via chrome.identity
 * uses byok (user provides their own client id)
 */
export async function authenticate(clientId: string): Promise<string> {
  // mock mode for development
  if (IS_DEBUG) {
    cachedToken = getMockToken();
    tokenExpiry = Date.now() + 3600000; // 1 hour
    return cachedToken;
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

  cachedToken = tokenData.access_token;
  tokenExpiry = Date.now() + (tokenData.expires_in * 1000);

  // store refresh token for later
  await chrome.storage.local.set({
    refreshToken: tokenData.refresh_token
  });

  return cachedToken;
}

/**
 * gets current token if valid
 */
export function getToken(): string | null {
  if (IS_DEBUG && !cachedToken) {
    cachedToken = getMockToken();
    tokenExpiry = Date.now() + 3600000;
  }

  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  return null;
}

/**
 * clears auth state
 */
export function clearAuth(): void {
  cachedToken = null;
  tokenExpiry = 0;
}
