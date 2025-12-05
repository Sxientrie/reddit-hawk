// zod schemas
// type-safe definitions for reddit api responses and config
// resilient parsing - graceful fallbacks for malformed data

import { z } from 'zod';
import { IS_DEBUG } from '@utils/constants';

/**
 * helper for resilient parsing with debug logging
 * catches validation errors, logs them (in debug), and returns fallback
 */
function resilient<T extends z.ZodTypeAny>(schema: T, fallback: z.infer<T> | T) {
  return schema.catch((ctx) => {
    if (IS_DEBUG) {
      const issue = ctx.error.issues[0];
      const path = issue?.path.join('.') || 'root';
      const msg = issue?.message || 'validation failed';
      console.warn(`[sxentrie] schema warning (${path}): ${msg}`, { 
        input: ctx.input,
        issues: ctx.error.issues 
      });
    }
    return fallback;
  });
}

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
 * uses resilient() for volatile fields - reliability > strictness
 */
export const HitSchema = z.object({
  // required fields - fail if missing
  id: z.string(),
  title: resilient(z.string(), '[untitled]'),
  subreddit: z.string(),
  permalink: z.string(),

  // volatile fields - graceful fallbacks
  author: resilient(z.string(), '[deleted]'),
  url: resilient(z.string().optional(), undefined),
  selftext: resilient(z.string().optional(), undefined),
  created_utc: resilient(coerceNumber, Date.now() / 1000),
  score: resilient(z.number(), 0),
  num_comments: resilient(z.number(), 0),
  link_flair_text: resilient(z.string().nullable(), null),
  is_self: resilient(z.boolean(), true),
  over_18: resilient(z.boolean(), false),

  // additional fields reddit may include
  thumbnail: resilient(z.string().optional(), undefined),
  domain: resilient(z.string().optional(), undefined),
  distinguished: resilient(z.string().nullable().optional(), null),
  stickied: resilient(z.boolean().optional(), false)
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
  // log critical failure even in production, but especially in debug
  if (IS_DEBUG) {
    console.warn('[sxentrie] parsing critical failure:', result.error.issues);
  }
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
  subreddits: resilient(z.array(z.string()), []),
  keywords: resilient(z.array(z.string()), []),
  poisonKeywords: resilient(z.array(z.string()), []),
  pollingInterval: resilient(z.number().min(10).max(300), 30),
  audioEnabled: resilient(z.boolean(), true),
  quietHours: resilient(z.object({
    enabled: resilient(z.boolean(), false),
    start: resilient(z.string(), '22:00'),
    end: resilient(z.string(), '08:00')
  }), {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }),
  webhookUrl: resilient(z.string().url().optional(), undefined),
  clientId: resilient(z.string().optional(), undefined)
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
