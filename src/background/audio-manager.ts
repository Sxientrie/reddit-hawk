// audio manager
// handles offscreen document lifecycle and sound playback

import { log } from '@utils/logger';

const OFFSCREEN_DOCUMENT_PATH = 'src/offscreen/offscreen.html';

let isCreating = false;

/**
 * ensures offscreen document exists (creates if needed)
 */
async function ensureOffscreenDocument(): Promise<void> {
  // check if already exists
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
    documentUrls: [chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH)]
  });

  if (existingContexts.length > 0) {
    return;
  }

  // avoid race condition if multiple calls happen simultaneously
  if (isCreating) {
    // wait a bit and check again
    await new Promise(resolve => setTimeout(resolve, 100));
    return ensureOffscreenDocument();
  }

  isCreating = true;

  try {
    await chrome.offscreen.createDocument({
      url: OFFSCREEN_DOCUMENT_PATH,
      reasons: [chrome.offscreen.Reason.AUDIO_PLAYBACK],
      justification: 'Play notification sounds for new Reddit posts'
    });
    
    log.bg.info('offscreen document created');
  } catch (err) {
    // may fail if document already exists (race condition)
    if (!(err instanceof Error && err.message.includes('already exists'))) {
      log.bg.error('failed to create offscreen document:', err);
    }
  } finally {
    isCreating = false;
  }
}

/**
 * plays a notification sound
 * creates offscreen document if needed
 */
export async function playNotificationSound(sound = 'notification'): Promise<void> {
  try {
    await ensureOffscreenDocument();
    
    await chrome.runtime.sendMessage({
      type: 'PLAY_SOUND',
      payload: { sound }
    });
    
    log.bg.debug(`sent PLAY_SOUND: ${sound}`);
  } catch (err) {
    log.bg.warn('failed to play notification sound:', err);
  }
}
