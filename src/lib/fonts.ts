// font injection utility
// generates @font-face css with chrome.runtime.getURL for shadow dom

/**
 * font configuration
 */
interface FontConfig {
  family: string;
  weight: number | string;
  style: 'normal' | 'italic';
  file: string;
}

const FONTS: FontConfig[] = [
  { family: 'Inter', weight: 400, style: 'normal', file: 'Inter-Regular.woff2' },
  { family: 'Inter', weight: 500, style: 'normal', file: 'Inter-Medium.woff2' },
  { family: 'Inter', weight: 600, style: 'normal', file: 'Inter-SemiBold.woff2' },
  { family: 'JetBrains Mono', weight: 400, style: 'normal', file: 'JetBrainsMono-Regular.woff2' }
];

/**
 * generates @font-face declarations for shadow dom
 * uses chrome.runtime.getURL for absolute extension paths
 */
export function generateFontFaceCSS(): string {
  return FONTS.map(font => {
    const url = chrome.runtime.getURL(`assets/fonts/${font.file}`);
    return `
@font-face {
  font-family: '${font.family}';
  font-weight: ${font.weight};
  font-style: ${font.style};
  font-display: swap;
  src: url('${url}') format('woff2');
}`;
  }).join('\n');
}

/**
 * creates stylesheet with font declarations
 */
export function createFontStyleSheet(): CSSStyleSheet {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(generateFontFaceCSS());
  return sheet;
}

/**
 * verifies fonts loaded correctly
 * logs warning if blocked by csp or missing files
 */
export async function verifyFontsLoaded(): Promise<void> {
  // wait for fonts to attempt loading
  await document.fonts.ready;

  for (const font of FONTS) {
    const fontSpec = `${font.weight} 12px '${font.family}'`;
    const loaded = document.fonts.check(fontSpec);

    if (!loaded) {
      console.warn(
        `[sxentrie] font not loaded: ${font.family} ${font.weight}. ` +
        `Check if file exists: assets/fonts/${font.file}`
      );
    }
  }
}

/**
 * preloads font files to trigger early fetch
 */
export function preloadFonts(): void {
  for (const font of FONTS) {
    const url = chrome.runtime.getURL(`assets/fonts/${font.file}`);
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'font';
    link.type = 'font/woff2';
    link.href = url;
    link.crossOrigin = 'anonymous';
    // append to shadow root, not document head
    // caller must handle this
  }
}
