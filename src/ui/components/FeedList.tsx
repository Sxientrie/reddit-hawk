// feed list component
// displays list of reddit hits with empty state

import { HitCard } from './HitCard';
import type { Hit } from '@/types/schemas';

interface FeedListProps {
  hits: Hit[];
  onDismiss: (id: string) => void;
}

export function FeedList({ hits, onDismiss }: FeedListProps) {
  if (hits.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-zinc-600 opacity-60">
        <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="m4.93 4.93 14.14 14.14"/>
        </svg>
        <span className="font-mono text-xs tracking-wide">NO SIGNAL</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
      {hits.map((hit) => (
        <HitCard key={hit.id} hit={hit} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
