// svelte compiler configuration
// runes mode + injected css for shadow dom compatibility

import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  compilerOptions: {
    runes: true,
    css: 'injected'
  }
};
