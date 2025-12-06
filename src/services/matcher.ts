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
 * supports word boundary matching for more accurate results
 */
function createKeywordRegex(keyword: string): RegExp {
  const escaped = escapeRegex(keyword.trim());
  // match whole words or as part of compound words
  return new RegExp(escaped, 'i');
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
 * logic:
 * - if include keywords exist, hit MUST match at least one
 * - if poison keywords exist, hit MUST NOT match any
 * - if no keywords set, all hits pass
 */
export function matchesFilters(hit: Hit, config: Config): boolean {
  const { keywords, poisonKeywords } = config;
  
  // combine title and selftext for matching
  const searchText = `${hit.title} ${hit.selftext || ''}`.toLowerCase();
  
  // check poison keywords first (exclusion)
  if (poisonKeywords.length > 0) {
    if (matchesAny(searchText, poisonKeywords)) {
      log.poller.debug(`hit filtered (poison): "${hit.title.slice(0, 40)}..."`);
      return false;
    }
  }
  
  // check include keywords (if any are set, at least one must match)
  if (keywords.length > 0) {
    if (!matchesAny(searchText, keywords)) {
      log.poller.debug(`hit filtered (no match): "${hit.title.slice(0, 40)}..."`);
      return false;
    }
  }
  
  // passed all filters
  return true;
}

/**
 * filters an array of hits based on config
 * returns only hits that pass all filters
 */
export function filterHits(hits: Hit[], config: Config): Hit[] {
  const hasFilters = config.keywords.length > 0 || config.poisonKeywords.length > 0;
  
  if (!hasFilters) {
    return hits;
  }
  
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
