// zod schemas
// type-safe definitions for reddit api responses and config
// resilient parsing - graceful fallbacks for malformed data

import { z } from 'zod';

/**
 * coerces string timestamps to numbers
 * reddit sometimes returns timestamps as strings
 */
const coerceNumber = z.union([
  z.number(),
  z.string().transform(s => parseFloat(s))
]).pipe(z.number());

/**
 * reddit post schema
 * maps to /r/subreddit/new.json response structure
 * uses .catch() for volatile fields - reliability > strictness
 */
export const HitSchema = z.object({
  // required fields - fail if missing
  id: z.string(),
  title: z.string().catch('[untitled]'),
  subreddit: z.string(),
  permalink: z.string(),

  // volatile fields - graceful fallbacks
  author: z.string().catch('[deleted]'),
  url: z.string().optional().catch(undefined),
  selftext: z.string().optional().catch(undefined),
  created_utc: coerceNumber.catch(Date.now() / 1000),
  score: z.number().catch(0),
  num_comments: z.number().catch(0),
  link_flair_text: z.string().nullable().catch(null),
  is_self: z.boolean().catch(true),
  over_18: z.boolean().catch(false),

  // additional fields reddit may include
  thumbnail: z.string().optional().catch(undefined),
  domain: z.string().optional().catch(undefined),
  distinguished: z.string().nullable().optional().catch(null),
  stickied: z.boolean().optional().catch(false)
});

export type Hit = z.infer<typeof HitSchema>;

/**
 * parses single hit with error recovery
 * returns null if critical fields missing
 */
export function parseHit(data: unknown): Hit | null {
  const result = HitSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn('[sxentrie] failed to parse hit:', result.error.issues);
  return null;
}

/**
 * parses array of hits, filtering out failures
 */
export function parseHits(data: unknown[]): Hit[] {
  return data
    .map(item => parseHit(item))
    .filter((hit): hit is Hit => hit !== null);
}

/**
 * extension config schema
 * stored in chrome.storage.local
 * all fields have safe defaults
 */
export const ConfigSchema = z.object({
  subreddits: z.array(z.string()).catch([]),
  keywords: z.array(z.string()).catch([]),
  poisonKeywords: z.array(z.string()).catch([]),
  pollingInterval: z.number().min(10).max(300).catch(30),
  audioEnabled: z.boolean().catch(true),
  quietHours: z.object({
    enabled: z.boolean().catch(false),
    start: z.string().catch('22:00'),
    end: z.string().catch('08:00')
  }).catch({
    enabled: false,
    start: '22:00',
    end: '08:00'
  }),
  webhookUrl: z.string().url().optional().catch(undefined),
  clientId: z.string().optional().catch(undefined)
});

export type Config = z.infer<typeof ConfigSchema>;

/**
 * message types for runtime messaging
 */
export const MessageTypeSchema = z.enum([
  'START_SCAN',
  'STOP_SCAN',
  'UPDATE_CONFIG',
  'NEW_HIT',
  'PLAY_SOUND',
  'KEEP_ALIVE',
  'LOG_ENTRY',
  'TOGGLE_OVERLAY'
]);

export type MessageType = z.infer<typeof MessageTypeSchema>;

/**
 * runtime message schema
 */
export const RuntimeMessageSchema = z.object({
  type: MessageTypeSchema,
  payload: z.unknown().optional()
});

export type RuntimeMessage = z.infer<typeof RuntimeMessageSchema>;
