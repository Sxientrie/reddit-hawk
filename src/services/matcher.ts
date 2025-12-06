// keyword matcher
// filters hits based on include/exclude patterns

import type { Hit, Config } from '@/types/schemas';
import { log } from '@utils/logger';

/**
 * escapes special regex characters in a string
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * creates a case-insensitive regex from keyword
 * uses word boundaries (\b) for precision, but only where applicable
 * handles edge cases: "C++" (no boundaries), ".NET" (end boundary only), "React" (both boundaries)
 */
function createKeywordRegex(keyword: string): RegExp {
  const trimmed = keyword.trim();
  const escaped = escapeRegex(trimmed);
  
  // check if keyword starts/ends with word characters (a-z, 0-9, _)
  // word boundaries (\b) only work with word characters
  const startsWithWord = /^\w/.test(trimmed);
  const endsWithWord = /\w$/.test(trimmed);
  
  // conditionally add word boundaries
  const prefix = startsWithWord ? '\\b' : '';
  const suffix = endsWithWord ? '\\b' : '';
  
  const pattern = `${prefix}${escaped}${suffix}`;
  
  return new RegExp(pattern, 'i');
}

/**
 * checks if text contains any of the given keywords
 */
function matchesAny(text: string, keywords: string[]): boolean {
  if (keywords.length === 0) return false;
  
  const lowerText = text.toLowerCase();
  
  return keywords.some(keyword => {
    if (!keyword) return false;
    
    try {
      const regex = createKeywordRegex(keyword);
      return regex.test(lowerText);
    } catch {
      // fallback to simple includes if regex fails
      return lowerText.includes(keyword.toLowerCase());
    }
  });
}

/**
 * checks if a hit passes the keyword filters
 * 
 * strict 1+1=2 rule:
 * - keywords are MANDATORY (no keywords = no hits, fail-safe to silence)
 * - if include keywords exist, hit MUST match at least one
 * - if poison keywords exist, hit MUST NOT match any
 */
export function matchesFilters(hit: Hit, config: Config): boolean {
  const { keywords, poisonKeywords } = config;
  
  // combine title and selftext for matching
  const searchText = `${hit.title} ${hit.selftext || ''}`.toLowerCase();
  
  // MANDATORY: keywords must be configured (fail-safe to silence)
  if (keywords.length === 0) {
    log.poller.debug('hit filtered (no keywords configured - strict mode)');
    return false;
  }
  
  // check poison keywords first (exclusion)
  if (poisonKeywords.length > 0) {
    if (matchesAny(searchText, poisonKeywords)) {
      log.poller.debug(`hit filtered (poison): "${hit.title.slice(0, 40)}..."`);
      return false;
    }
  }
  
  // keywords exist - at least one must match
  if (!matchesAny(searchText, keywords)) {
    log.poller.debug(`hit filtered (no match): "${hit.title.slice(0, 40)}..."`);
    return false;
  }
  
  // passed all filters
  return true;
}

/**
 * filters an array of hits based on config
 * returns only hits that pass all filters
 * keywords are mandatory - empty keywords = zero hits
 */
export function filterHits(hits: Hit[], config: Config): Hit[] {
  // always filter - keywords are mandatory
  const filtered = hits.filter(hit => matchesFilters(hit, config));
  
  if (filtered.length !== hits.length) {
    log.poller.info(`filtered ${hits.length - filtered.length}/${hits.length} hits`);
  }
  
  return filtered;
}

/**
 * debug: tests a keyword against sample text
 * useful for settings UI "test regex" feature
 */
export function testKeyword(keyword: string, text: string): boolean {
  return matchesAny(text, [keyword]);
}
