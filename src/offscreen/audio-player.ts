// offscreen audio player
// handles PLAY_SOUND messages from background

console.log('[sxentrie] offscreen document loaded');

// audio element for notifications
const audio = new Audio();
audio.volume = 0.7;

// listen for messages from background
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'PLAY_SOUND') {
    playSound(message.payload?.sound || 'notification');
    sendResponse({ success: true });
  }
  return true;
});

/**
 * plays the specified sound file
 */
async function playSound(soundName: string) {
  try {
    // construct path to audio file
    const soundUrl = chrome.runtime.getURL(`assets/audio/${soundName}.mp3`);
    
    audio.src = soundUrl;
    audio.currentTime = 0;
    
    await audio.play();
    console.log(`[sxentrie] played sound: ${soundName}`);
  } catch (err) {
    console.warn('[sxentrie] failed to play sound:', err);
  }
}

// keep the offscreen document alive
// ping every 20 seconds to prevent browser from closing it
setInterval(() => {
  console.log('[sxentrie] offscreen keepalive ping');
}, 20000);
