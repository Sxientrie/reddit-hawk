// svelte compiler configuration
// runes mode + external css for shadow dom manual injection

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
    // external css - emitted as separate file for shadow dom injection
    // 'injected' would insert into document.head (breaks shadow dom isolation)
    css: 'external'
  }
};
