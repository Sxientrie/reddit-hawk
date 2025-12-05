// vite configuration
// multi-entry build for chrome extension (mv3)

import { defineConfig, build } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// custom plugin to build content script as IIFE separately
function contentScriptPlugin() {
  return {
    name: 'content-script-iife',
    async writeBundle() {
      // build content script as IIFE after main build
      await build({
        configFile: false,
        build: {
          outDir: 'dist',
          emptyOutDir: false,
          lib: {
            entry: resolve(__dirname, 'src/content/index.ts'),
            name: 'sxentrie',
            formats: ['iife'],
            fileName: () => 'assets/content.js'
          },
          rollupOptions: {
            output: {
              extend: true,
              assetFileNames: 'assets/[name].[ext]'
            }
          },
          minify: 'esbuild',
          sourcemap: false
        },
        plugins: [
          tailwindcss(),
          svelte({
            compilerOptions: {
              runes: true,
              // MUST be 'injected' for Shadow DOM - styles are embedded in component JS
              // 'external' would emit to document.head which Shadow DOM cannot see
              css: 'injected'
            }
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
        define: {
          'import.meta.env.IS_DEBUG': JSON.stringify(false)
        }
      });
    }
  };
}

export default defineConfig(({ mode, command }) => {
  const isProduction = command === 'build' && mode === 'production';

  return {
    define: {
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
          { src: 'assets/**/*', dest: 'assets' }
        ]
      }),
      contentScriptPlugin()
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
