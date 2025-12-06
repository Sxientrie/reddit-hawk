// settings panel component
// configuration ui with chip-based visualization of saved items

import { useState, useEffect } from 'react';
import { useConfig, DEFAULT_CONFIG } from '@lib/storage';
import { log } from '@utils/logger';

export function SettingsPanel() {
  const { value: config, isLoading, save } = useConfig();
  
  // local input state (unsaved)
  const [subredditInput, setSubredditInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [poisonInput, setPoisonInput] = useState('');
  const [pollingInterval, setPollingInterval] = useState(30);
  const [audioEnabled, setAudioEnabled] = useState(true);

  // hydrate from config
  useEffect(() => {
    if (!isLoading) {
      setPollingInterval(config.pollingInterval);
      setAudioEnabled(config.audioEnabled);
    }
  }, [config, isLoading]);

  const handleAddSubreddit = async () => {
    const trimmed = subredditInput.trim().toLowerCase();
    if (!trimmed || config.subreddits.includes(trimmed)) {
      setSubredditInput('');
      return;
    }

    await save({
      ...config,
      subreddits: [...config.subreddits, trimmed]
    });
    setSubredditInput('');
    log.ui.info(`added subreddit: ${trimmed}`);
  };

  const handleRemoveSubreddit = async (sub: string) => {
    await save({
      ...config,
      subreddits: config.subreddits.filter(s => s !== sub)
    });
    log.ui.info(`removed subreddit: ${sub}`);
  };

  const handleAddKeyword = async () => {
    const trimmed = keywordInput.trim().toLowerCase();
    if (!trimmed || config.keywords.includes(trimmed)) {
      setKeywordInput('');
      return;
    }

    await save({
      ...config,
      keywords: [...config.keywords, trimmed]
    });
    setKeywordInput('');
    log.ui.info(`added keyword: ${trimmed}`);
  };

  const handleRemoveKeyword = async (keyword: string) => {
    await save({
      ...config,
      keywords: config.keywords.filter(k => k !== keyword)
    });
    log.ui.info(`removed keyword: ${keyword}`);
  };

  const handleAddPoison = async () => {
    const trimmed = poisonInput.trim().toLowerCase();
    if (!trimmed || config.poisonKeywords.includes(trimmed)) {
      setPoisonInput('');
      return;
    }

    await save({
      ...config,
      poisonKeywords: [...config.poisonKeywords, trimmed]
    });
    setPoisonInput('');
    log.ui.info(`added poison keyword: ${trimmed}`);
  };

  const handleRemovePoison = async (keyword: string) => {
    await save({
      ...config,
      poisonKeywords: config.poisonKeywords.filter(k => k !== keyword)
    });
    log.ui.info(`removed poison keyword: ${keyword}`);
  };

  const handleSaveInterval = async () => {
    const validated = Math.max(10, Math.min(300, pollingInterval));
    await save({ ...config, pollingInterval: validated });
    log.ui.info(`updated interval: ${validated}s`);
  };

  const handleToggleAudio = async () => {
    const newValue = !audioEnabled;
    setAudioEnabled(newValue);
    await save({ ...config, audioEnabled: newValue });
    log.ui.info(`audio ${newValue ? 'enabled' : 'disabled'}`);
  };

  const handleKeyPress = (e: React.KeyboardEvent, handler: () => void) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handler();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-600 font-mono text-xs">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* subreddits */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
          Subreddits
        </label>
        <div className="relative">
          <input
            type="text"
            value={subredditInput}
            onChange={(e) => setSubredditInput(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAddSubreddit)}
            placeholder="e.g., webdev, freelance"
            className="w-full h-8 pl-2.5 pr-9 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 text-xs font-mono placeholder:text-zinc-700 focus:border-emerald-600 focus:outline-none transition-colors"
          />
          <button
            onClick={handleAddSubreddit}
            disabled={!subredditInput.trim()}
            className="absolute right-1 top-1 h-6 w-6 flex items-center justify-center rounded bg-emerald-600/20 border border-emerald-600/40 text-emerald-500 hover:bg-emerald-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Add subreddit (Enter)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
        {config.subreddits.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {config.subreddits.map((sub) => (
              <span
                key={sub}
                className="group inline-flex items-center gap-1 h-6 px-2 bg-zinc-800/60 border border-zinc-700/80 rounded text-[10px] font-mono text-zinc-400"
              >
                r/{sub}
                <button
                  onClick={() => handleRemoveSubreddit(sub)}
                  className="flex items-center justify-center w-3 h-3 rounded-full hover:bg-red-900/50 hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* include keywords */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
          Include Keywords
        </label>
        <div className="relative">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAddKeyword)}
            placeholder="e.g., hiring, looking for"
            className="w-full h-8 pl-2.5 pr-9 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 text-xs font-mono placeholder:text-zinc-700 focus:border-emerald-600 focus:outline-none transition-colors"
          />
          <button
            onClick={handleAddKeyword}
            disabled={!keywordInput.trim()}
            className="absolute right-1 top-1 h-6 w-6 flex items-center justify-center rounded bg-emerald-600/20 border border-emerald-600/40 text-emerald-500 hover:bg-emerald-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Add keyword (Enter)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
        {config.keywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {config.keywords.map((kw) => (
              <span
                key={kw}
                className="group inline-flex items-center gap-1 h-6 px-2 bg-emerald-900/20 border border-emerald-700/40 rounded text-[10px] font-mono text-emerald-400"
              >
                {kw}
                <button
                  onClick={() => handleRemoveKeyword(kw)}
                  className="flex items-center justify-center w-3 h-3 rounded-full hover:bg-red-900/50 hover:text-red-400 transition-colors"
                  title="Remove"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* exclude keywords */}
      <div className="flex flex-col gap-2">
        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
          Exclude Keywords
        </label>
        <div className="relative">
          <input
            type="text"
            value={poisonInput}
            onChange={(e) => setPoisonInput(e.target.value)}
            onKeyPress={(e) => handleKeyPress(e, handleAddPoison)}
            placeholder="e.g., homework, free"
            className="w-full h-8 pl-2.5 pr-9 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 text-xs font-mono placeholder:text-zinc-700 focus:border-red-600 focus:outline-none transition-colors"
          />
          <button
            onClick={handleAddPoison}
            disabled={!poisonInput.trim()}
            className="absolute right-1 top-1 h-6 w-6 flex items-center justify-center rounded bg-red-600/20 border border-red-600/40 text-red-500 hover:bg-red-600/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            title="Add exclusion (Enter)"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>
        </div>
        {config.poisonKeywords.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {config.poisonKeywords.map((kw) => (
              <span
                key={kw}
                className="group inline-flex items-center gap-1 h-6 px-2 bg-red-900/20 border border-red-700/40 rounded text-[10px] font-mono text-red-400"
              >
                {kw}
                <button
                  onClick={() => handleRemovePoison(kw)}
                  className="flex items-center justify-center w-3 h-3 rounded-full hover:bg-red-900/50 hover:text-red-300 transition-colors"
                  title="Remove"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12"/>
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* interval and audio */}
      <div className="flex gap-3 pt-2 border-t border-zinc-800">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
            Interval (sec)
          </label>
          <div className="flex gap-1">
            <input
              type="number"
              value={pollingInterval}
              onChange={(e) => setPollingInterval(Number(e.target.value))}
              onBlur={handleSaveInterval}
              onKeyPress={(e) => handleKeyPress(e, handleSaveInterval)}
              min={10}
              max={300}
              className="flex-1 h-8 px-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 text-xs font-mono focus:border-zinc-600 focus:outline-none transition-colors"
            />
          </div>
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
            Audio
          </label>
          <button
            onClick={handleToggleAudio}
            className={`h-8 px-3 rounded-md text-[10px] font-semibold font-mono tracking-wide transition-all ${
              audioEnabled
                ? 'bg-emerald-700/30 text-emerald-400 border border-emerald-600/60'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}
          >
            {audioEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
}
