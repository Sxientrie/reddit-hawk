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
 * uses chrome.runtime.getURL for absolute paths
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
