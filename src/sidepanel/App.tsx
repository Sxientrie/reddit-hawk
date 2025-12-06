// sidepanel app
// main react component for chrome side panel

import { useState, useEffect, useCallback } from 'react';
import { FeedList } from '@ui/components/FeedList';
import { SettingsPanel } from '@ui/components/SettingsPanel';
import type { Hit } from '@/types/schemas';
import { log } from '@utils/logger';

const STORAGE_KEY = 'sxentrie_hits_cache';
const MAX_CACHED_HITS = 100;

type Tab = 'feed' | 'settings';

export function App() {
  const [hits, setHits] = useState<Hit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('feed');

  // dismiss a hit (writes back to storage)
  const handleDismiss = useCallback((id: string) => {
    setHits((prev) => {
      const filtered = prev.filter((h) => h.id !== id);
      
      // write filtered list back to storage
      chrome.storage.local.set({ [STORAGE_KEY]: filtered.slice(0, MAX_CACHED_HITS) })
        .catch(() => {}); // silent fail
      
      return filtered;
    });
  }, []);

  // hydrate from storage and setup reactive listener
  useEffect(() => {
    log.ui.info('side panel mounted');

    // initial hydration from storage
    chrome.storage.local.get(STORAGE_KEY).then((result) => {
      if (result[STORAGE_KEY] && Array.isArray(result[STORAGE_KEY])) {
        setHits(result[STORAGE_KEY].slice(0, MAX_CACHED_HITS));
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    // listen for storage changes from service worker
    const storageListener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: string
    ) => {
      if (area === 'local' && changes[STORAGE_KEY]) {
        const newHits = changes[STORAGE_KEY].newValue;
        if (Array.isArray(newHits)) {
          setHits(newHits.slice(0, MAX_CACHED_HITS));
          log.ui.debug(`updated ${newHits.length} hits from storage`);
        }
      }
    };

    chrome.storage.onChanged.addListener(storageListener);
    return () => chrome.storage.onChanged.removeListener(storageListener);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200 font-sans text-sm antialiased">
      {/* header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
        <div className="flex items-center gap-2 text-emerald-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>
          </svg>
          <span className="font-mono text-xs font-bold tracking-widest text-zinc-400">SXENTRIE</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="font-mono text-xs font-semibold text-zinc-500">{hits.length}</span>
        </div>
      </header>

      {/* tabs */}
      <nav className="flex gap-1 px-3 py-2 border-b border-zinc-900">
        <button
          onClick={() => setActiveTab('feed')}
          className={`flex items-center justify-center gap-1.5 flex-1 h-9 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'feed'
              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
              : 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-900 border border-transparent'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/>
          </svg>
          Feed
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center justify-center gap-1.5 flex-1 h-9 px-3 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'settings'
              ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
              : 'text-zinc-500 hover:text-zinc-400 hover:bg-zinc-900 border border-transparent'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
          </svg>
          Settings
        </button>
      </nav>

      {/* content */}
      <main className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent">
        {activeTab === 'feed' ? (
          isLoading ? (
            <div className="flex items-center justify-center py-16 text-zinc-600 font-mono text-xs">
              Loading...
            </div>
          ) : (
            <FeedList hits={hits} onDismiss={handleDismiss} />
          )
        ) : (
          <SettingsPanel />
        )}
      </main>
    </div>
  );
}
