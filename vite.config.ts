// vite configuration
// multi-entry build for chrome extension (mv3)

import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode, command }) => {
  const isProduction = command === 'build' && mode === 'production';

  return {
    define: {
      // strict false for production builds - enables dead code elimination
      'import.meta.env.IS_DEBUG': JSON.stringify(!isProduction && mode === 'development')
    },
    plugins: [
      tailwindcss(),
      svelte({
        compilerOptions: {
          runes: true,
          css: 'external'
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
        usePolling: false
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      // no sourcemaps in production - prevents unsafe-eval csp violations
      sourcemap: isProduction ? false : 'hidden',
      minify: isProduction ? 'esbuild' : false,
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
  };
});
