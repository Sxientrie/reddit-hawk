// vite configuration
// multi-entry build for chrome extension (mv3) with react

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode, command }) => {
  const isProduction = command === 'build' && mode === 'production';

  return {
    base: '', // relative paths for extension context
    define: {
      'import.meta.env.IS_DEBUG': JSON.stringify(true) // always enable debug for now
    },
    plugins: [
      react(),
      tailwindcss(),
      viteStaticCopy({
        targets: [
          { src: 'manifest.json', dest: '.' },
          { src: 'assets/**/*', dest: 'assets' }
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
      hmr: false,
      watch: {
        usePolling: false
      }
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: isProduction ? false : 'hidden',
      minify: isProduction ? 'esbuild' : false,
      rollupOptions: {
        input: {
          background: resolve(__dirname, 'src/background/index.ts'),
          sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
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
