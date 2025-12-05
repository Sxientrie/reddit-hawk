// response parser
// transforms raw reddit api json into normalized hit objects

import { parseHits, type Hit } from '@/types/schemas';
import { debugWarn } from '@utils/debug';

interface RedditResponse {
  kind: string;
  data: {
    after: string | null;
    dist: number;
    children: Array<{
      kind: string;
      data: unknown;
    }>;
  };
}

/**
 * parses raw reddit response into typed hits
 * handles both single listing and array access
 */
export function parseRedditResponse(json: unknown): Hit[] {
  try {
    // reddit sometimes returns an object, sometimes valid json but unexpected structure
    if (!json || typeof json !== 'object') {
      throw new Error('Invalid JSON structure');
    }

    // cast to expected shape (optimistic)
    const response = json as RedditResponse;

    if (!response.data || !Array.isArray(response.data.children)) {
      debugWarn('parser: unexpected response format', json);
      return [];
    }

    // extract raw data objects from children
    const rawHits = response.data.children.map(child => child.data);

    // validate and filter using zod schema
    return parseHits(rawHits);

  } catch (err) {
    debugWarn('parser: failed to process response', err);
    return [];
  }
}
