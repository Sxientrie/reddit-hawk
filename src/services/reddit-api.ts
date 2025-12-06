// reddit api client (rogue mode)
// uses public json endpoints due to api restrictions
// strictly adheres to unauthenticated rate limits

import ky from 'ky';
import { parseRedditResponse } from '@services/parser';
import { RATE_LIMIT_THRESHOLD, REDDIT_BASE_URL, STORAGE_KEYS } from '@utils/constants';
import { log } from '@utils/logger';

// default rate limit values
const DEFAULT_RATE_LIMITS = {
  remaining: 100,
  reset: 0,
  used: 0
};

// internal state for passive header inspection
// persisted to chrome.storage.session to survive sw termination
let rateLimitRemaining = DEFAULT_RATE_LIMITS.remaining;
let rateLimitReset = DEFAULT_RATE_LIMITS.reset;
let rateLimitUsed = DEFAULT_RATE_LIMITS.used;

/**
 * error thrown when rate limit is exhausted
 */
export class RateLimitError extends Error {
  resetTime: number;
  constructor(resetTime: number) {
    super(`Rate limit exhausted. Reset in ${resetTime}s`);
    this.name = 'RateLimitError';
    this.resetTime = resetTime;
  }
}

/**
 * loads rate limit state from chrome.storage.session
 * restores ephemeral state after service worker wake-up
 */
async function loadRateLimits(): Promise<void> {
  try {
    const storage = chrome.storage.session ?? chrome.storage.local;
    const result = await storage.get(STORAGE_KEYS.RATE_LIMITS);
    const limits = result[STORAGE_KEYS.RATE_LIMITS];

    if (limits) {
      rateLimitRemaining = limits.remaining ?? DEFAULT_RATE_LIMITS.remaining;
      rateLimitReset = limits.reset ?? DEFAULT_RATE_LIMITS.reset;
      rateLimitUsed = limits.used ?? DEFAULT_RATE_LIMITS.used;
      log.api.debug(`limits loaded from storage - rem:${rateLimitRemaining}`);
    }
  } catch (err) {
    log.api.warn('failed to load rate limits, using defaults:', err);
  }
}

/**
 * saves rate limit state to chrome.storage.session
 * persists ephemeral state across service worker termination
 */
async function saveRateLimits(): Promise<void> {
  try {
    const storage = chrome.storage.session ?? chrome.storage.local;
    await storage.set({
      [STORAGE_KEYS.RATE_LIMITS]: {
        remaining: rateLimitRemaining,
        reset: rateLimitReset,
        used: rateLimitUsed
      }
    });
  } catch (err) {
    log.api.warn('failed to save rate limits:', err);
  }
}

/**
 * updates internal rate limit state from headers
 * public endpoints may not always return these, so we trust them if present
 */
async function updateRateLimits(headers: Headers) {
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const used = headers.get('x-ratelimit-used');

  if (remaining) rateLimitRemaining = parseFloat(remaining);
  if (reset) rateLimitReset = parseFloat(reset);
  if (used) rateLimitUsed = parseFloat(used);

  log.api.info(`limits updated - rem:${rateLimitRemaining} reset:${rateLimitReset}s`);

  // persist to storage immediately after update
  await saveRateLimits();
}

/**
 * public client instance
 * no auth headers, strictly public endpoints
 */
function getClient() {
  return ky.create({
    prefixUrl: REDDIT_BASE_URL,
    headers: {
      'User-Agent': 'web:sxentrie:v0.1.0' // essential to avoid instant block
    },
    hooks: {
      afterResponse: [
        async (_request, _options, response) => {
          await updateRateLimits(response.headers);
        }
      ]
    },
    retry: {
      limit: 2,
      statusCodes: [408, 413, 429, 500, 502, 503, 504],
      afterStatusCodes: [413, 429, 503]
    },
    credentials: 'include', // piggyback on user's browser session
    timeout: 10000
  });
}

/**
 * fetches a batch of subreddits
 * @param subreddits list of subreddit names
 * @param limit number of posts to fetch (max 100)
 */
export async function fetchSubredditBatch(
  subreddits: string[], 
  limit = 100
) {
  // restore rate limits from storage (survives sw termination)
  await loadRateLimits();

  // safety check - passive inspection
  if (rateLimitRemaining < RATE_LIMIT_THRESHOLD) {
    log.api.warn('api: rate limit threshold reached pre-flight');
    throw new RateLimitError(rateLimitReset);
  }

  if (subreddits.length === 0) return [];

  const client = getClient();
  const path = `r/${subreddits.join('+')}/new.json`;

  try {
    const json = await client.get(path, {
      searchParams: { limit }
    }).json();

    return parseRedditResponse(json);

  } catch (err: any) {
    // handle 429 specifically if caught by ky
    if (err?.response?.status === 429) {
      throw new RateLimitError(rateLimitReset || 60);
    }
    throw err;
  }
}

/**
 * exposes rate limit state for debugging
 */
export function getApiDebugState() {
  return {
    get remaining() { return rateLimitRemaining; },
    get reset() { return rateLimitReset; },
    get used() { return rateLimitUsed; }
  };
}
