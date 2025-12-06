// hit card component
// displays a single reddit post with dismiss functionality

import { useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import type { Hit } from '@/types/schemas';

interface HitCardProps {
  hit: Hit;
  onDismiss: (id: string) => void;
}

export function HitCard({ hit, onDismiss }: HitCardProps) {
  const timeAgo = useMemo(() => {
    try {
      return formatDistanceToNow(new Date(hit.created_utc * 1000), { addSuffix: true })
        .replace('about ', '')
        .replace('less than a minute', 'now');
    } catch {
      return 'now';
    }
  }, [hit.created_utc]);

  const handleClick = () => {
    window.open(`https://www.reddit.com${hit.permalink}`, '_blank');
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDismiss(hit.id);
  };

  return (
    <article
      onClick={handleClick}
      className="group relative flex flex-col gap-1.5 p-2.5 bg-zinc-800/40 border border-zinc-700/50 rounded-lg cursor-pointer transition-all hover:bg-zinc-800/60 hover:border-zinc-600/60"
    >
      {/* header */}
      <header className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex items-center gap-1.5 min-w-0 flex-1 overflow-hidden">
          <span className="font-mono text-[10px] font-semibold text-emerald-500 shrink-0">
            r/{hit.subreddit}
          </span>
          <span className="font-mono text-[10px] text-zinc-500 truncate">
            u/{hit.author}
          </span>
        </div>
        <time className="font-mono text-[9px] text-zinc-600 shrink-0">
          {timeAgo}
        </time>
      </header>

      {/* title */}
      <h3 className="text-xs font-medium leading-relaxed text-zinc-300 line-clamp-2 group-hover:text-white">
        {hit.title}
      </h3>

      {/* dismiss button */}
      <button
        onClick={handleDismiss}
        title="Dismiss"
        className="absolute top-1.5 right-1.5 flex items-center justify-center w-4.5 h-4.5 bg-zinc-800 border border-zinc-700 rounded-full text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/50 hover:text-red-400 hover:border-red-800"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
        </svg>
      </button>
    </article>
  );
}
