// feed list component
// displays virtualized list of reddit hits for performance
// only renders visible items to prevent dom bloat

import * as ReactWindow from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { HitCard } from './HitCard';
import type { Hit } from '@/types/schemas';

interface FeedListProps {
  hits: Hit[];
  onDismiss: (id: string) => void;
}

// fixed height per item (matches HitCard dimensions)
// header (20px) + title (2 lines × 18px) + padding (16px) + gap (8px) = 72px
const ITEM_HEIGHT = 72;
const ITEM_GAP = 8;

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
    <div className="flex-1" style={{ height: '100%', width: '100%' }}>
      <AutoSizer>
        {({ height, width }) => (
          <ReactWindow.FixedSizeList
            height={height}
            width={width}
            itemCount={hits.length}
            itemSize={ITEM_HEIGHT + ITEM_GAP}
            itemData={{ hits, onDismiss }}
            className="virtualized-list"
            style={{
              // zinc-themed scrollbar
              scrollbarWidth: 'thin',
              scrollbarColor: '#3f3f46 transparent'
            }}
          >
            {Row}
          </ReactWindow.FixedSizeList>
        )}
      </AutoSizer>
    </div>
  );
}

// virtualized row renderer
interface RowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    hits: Hit[];
    onDismiss: (id: string) => void;
  };
}

function Row({ index, style, data }: RowProps) {
  const { hits, onDismiss } = data;
  const hit = hits[index];

  return (
    <div
      style={{
        ...style,
        top: `${parseFloat(style.top as string)}px`,
        paddingBottom: `${ITEM_GAP}px`
      }}
    >
      <HitCard hit={hit} onDismiss={onDismiss} />
    </div>
  );
}
