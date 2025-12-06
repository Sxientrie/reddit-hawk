// global constants
// api endpoints, limits, defaults

// debug mode - set via vite define
export const IS_DEBUG = true; // import.meta.env.IS_DEBUG ?? false;

export const REDDIT_BASE_URL = 'https://www.reddit.com';
export const REDDIT_OAUTH_URL = 'https://oauth.reddit.com';

export const DEFAULT_POLLING_INTERVAL = 30; // seconds
export const MAX_POLLING_INTERVAL = 300;
export const MIN_POLLING_INTERVAL = 10;

export const MAX_URL_LENGTH = 2000; // chars, ~40-50 subs
export const RATE_LIMIT_THRESHOLD = 5; // pause when remaining < this

export const MSG_TYPE = {
  START_SCAN: 'START_SCAN',
  STOP_SCAN: 'STOP_SCAN',
  UPDATE_CONFIG: 'UPDATE_CONFIG',
  NEW_HIT: 'NEW_HIT',
  PLAY_SOUND: 'PLAY_SOUND',
  KEEP_ALIVE: 'KEEP_ALIVE'
} as const;

export const STORAGE_KEYS = {
  CONFIG: 'config',
  SEEN_SET: 'seenSet',
  LAST_HEARTBEAT: 'lastHeartbeat',
  RATE_LIMITS: 'rateLimits',
  LATEST_HIT_TIMESTAMP: 'latestHitTimestamp',
  SYSTEM_STATUS: 'systemStatus'
} as const;

// alarm names
export const ALARM_NAME = {
  POLLER: 'sxentrie_poller'
} as const;
