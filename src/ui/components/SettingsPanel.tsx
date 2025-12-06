// settings panel component
// configuration ui for subreddits, keywords, and preferences

import { useState, useEffect } from 'react';
import { useConfig, DEFAULT_CONFIG } from '@lib/storage';
import { log } from '@utils/logger';

export function SettingsPanel() {
  const { value: config, isLoading, save, reset } = useConfig();
  
  // local form state
  const [subreddits, setSubreddits] = useState('');
  const [keywords, setKeywords] = useState('');
  const [poisonKeywords, setPoisonKeywords] = useState('');
  const [pollingInterval, setPollingInterval] = useState(30);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // hydrate form when config loads
  useEffect(() => {
    if (!isLoading) {
      setSubreddits(config.subreddits.join(', '));
      setKeywords(config.keywords.join(', '));
      setPoisonKeywords(config.poisonKeywords.join(', '));
      setPollingInterval(config.pollingInterval);
      setAudioEnabled(config.audioEnabled);
    }
  }, [config, isLoading]);

  const parseList = (input: string): string[] => {
    return input
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await save({
        subreddits: parseList(subreddits),
        keywords: parseList(keywords),
        poisonKeywords: parseList(poisonKeywords),
        pollingInterval: Math.max(10, Math.min(300, pollingInterval)),
        audioEnabled,
        quietHours: config.quietHours
      });
      log.ui.info('settings saved');
    } catch (err) {
      log.ui.error('failed to save settings:', err);
    }
    setIsSaving(false);
  };

  const handleReset = async () => {
    await reset();
    setSubreddits('');
    setKeywords('');
    setPoisonKeywords('');
    setPollingInterval(30);
    setAudioEnabled(true);
    log.ui.info('settings reset');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-600 font-mono text-xs">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* subreddits */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
          Subreddits
        </label>
        <input
          type="text"
          value={subreddits}
          onChange={(e) => setSubreddits(e.target.value)}
          placeholder="webdev, freelance, forhire"
          className="h-8 px-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 text-xs font-mono placeholder:text-zinc-700 focus:border-zinc-600 focus:outline-none transition-colors"
        />
      </div>

      {/* include keywords */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
          Include
        </label>
        <input
          type="text"
          value={keywords}
          onChange={(e) => setKeywords(e.target.value)}
          placeholder="hiring, looking for, need"
          className="h-8 px-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 text-xs font-mono placeholder:text-zinc-700 focus:border-zinc-600 focus:outline-none transition-colors"
        />
      </div>

      {/* exclude keywords */}
      <div className="flex flex-col gap-1">
        <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
          Exclude
        </label>
        <input
          type="text"
          value={poisonKeywords}
          onChange={(e) => setPoisonKeywords(e.target.value)}
          placeholder="homework, free, exposure"
          className="h-8 px-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 text-xs font-mono placeholder:text-zinc-700 focus:border-zinc-600 focus:outline-none transition-colors"
        />
      </div>

      {/* interval and audio */}
      <div className="flex gap-3">
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
            Interval (sec)
          </label>
          <input
            type="number"
            value={pollingInterval}
            onChange={(e) => setPollingInterval(Number(e.target.value))}
            min={10}
            max={300}
            className="h-8 px-2.5 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400 text-xs font-mono focus:border-zinc-600 focus:outline-none transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1 flex-1">
          <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wide">
            Audio
          </label>
          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`h-8 px-3 rounded-md text-[10px] font-semibold font-mono tracking-wide transition-all ${
              audioEnabled
                ? 'bg-zinc-700 text-zinc-300 border border-zinc-600'
                : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
            }`}
          >
            {audioEnabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* actions */}
      <div className="flex gap-1.5 justify-end pt-2 mt-1 border-t border-zinc-800">
        <button
          onClick={handleReset}
          className="h-8 px-3.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-500 text-[10px] font-semibold hover:bg-zinc-700 hover:text-zinc-400 transition-all"
        >
          Reset
        </button>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="h-8 px-3.5 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-500 text-[10px] font-semibold hover:bg-zinc-700 hover:text-zinc-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}
