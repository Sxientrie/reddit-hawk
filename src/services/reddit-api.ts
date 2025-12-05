// reddit api client (rogue mode)
// uses public json endpoints due to api restrictions
// strictly adheres to unauthenticated rate limits

import ky from 'ky';
import { parseRedditResponse } from '@services/parser';
import { RATE_LIMIT_THRESHOLD, REDDIT_BASE_URL } from '@utils/constants';
import { log } from '@utils/logger';

// internal state for passive header inspection
let rateLimitRemaining = 100; // stricter default for public
let rateLimitReset = 0;
let rateLimitUsed = 0;

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
 * updates internal rate limit state from headers
 * public endpoints may not always return these, so we trust them if present
 */
function updateRateLimits(headers: Headers) {
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const used = headers.get('x-ratelimit-used');

  if (remaining) rateLimitRemaining = parseFloat(remaining);
  if (reset) rateLimitReset = parseFloat(reset);
  if (used) rateLimitUsed = parseFloat(used);

  log.api.info(`limits updated - rem:${rateLimitRemaining} reset:${rateLimitReset}s`);
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
        (_request, _options, response) => {
          updateRateLimits(response.headers);
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
  // safety check - passive inspection
  if (rateLimitRemaining < RATE_LIMIT_THRESHOLD) {
    debugWarn('api: rate limit threshold reached pre-flight');
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
