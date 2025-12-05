// vite configuration
// multi-entry build for chrome extension (mv3)

import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => ({
  define: {
    'import.meta.env.IS_DEBUG': JSON.stringify(mode === 'development')
  },
  plugins: [
    tailwindcss(),
    svelte({
      compilerOptions: {
        runes: true,
        css: 'injected'
      }
    }),
    viteStaticCopy({
      targets: [
        { src: 'manifest.json', dest: '.' },
        { src: 'assets/*', dest: 'assets' }
      ]
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
      '@lib': resolve(__dirname, 'src/lib'),
      '@ui': resolve(__dirname, 'src/ui'),
      '@services': resolve(__dirname, 'src/services'),
      '@utils': resolve(__dirname, 'src/utils')
    }
  },
  server: {
    // disable hmr entirely - csp violations in content scripts
    // use `npm run build -- --watch` for live reload instead
    hmr: false,
    watch: {
      // watch for changes but don't inject hmr client
      usePolling: false
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'src/background/index.ts'),
        content: resolve(__dirname, 'src/content/index.ts'),
        popup: resolve(__dirname, 'src/popup/index.html'),
        offscreen: resolve(__dirname, 'src/offscreen/offscreen.html')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  }
}));
