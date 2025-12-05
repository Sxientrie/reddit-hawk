// zod schemas
// type-safe definitions for reddit api responses and config

import { z } from 'zod';

/**
 * reddit post schema
 * maps to /r/subreddit/new.json response structure
 */
export const HitSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  subreddit: z.string(),
  permalink: z.string(),
  url: z.string().optional(),
  selftext: z.string().optional(),
  created_utc: z.number(),
  score: z.number().default(0),
  num_comments: z.number().default(0),
  link_flair_text: z.string().nullable().optional(),
  is_self: z.boolean().default(true),
  over_18: z.boolean().default(false)
});

export type Hit = z.infer<typeof HitSchema>;

/**
 * extension config schema
 * stored in chrome.storage.local
 */
export const ConfigSchema = z.object({
  subreddits: z.array(z.string()).default([]),
  keywords: z.array(z.string()).default([]),
  poisonKeywords: z.array(z.string()).default([]),
  pollingInterval: z.number().min(10).max(300).default(30),
  audioEnabled: z.boolean().default(true),
  quietHours: z.object({
    enabled: z.boolean().default(false),
    start: z.string().default('22:00'),
    end: z.string().default('08:00')
  }).default({}),
  webhookUrl: z.string().url().optional()
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
  'KEEP_ALIVE'
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
