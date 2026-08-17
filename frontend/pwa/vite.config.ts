import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Same env files as web: frontend/.env (+ optional repo-root .env)
  const frontendDir = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(__dirname, '../..');
  const loaded = {
    ...loadEnv(mode, repoRoot, ''),
    ...loadEnv(mode, frontendDir, ''),
  };
  for (const [key, value] of Object.entries(loaded)) {
    if (key.startsWith('VITE_') && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }

  return {
    base: '/',
    envDir: frontendDir,
    publicDir: '../public',
    plugins: [
      react({
        jsxImportSource: '@emotion/react',
        babel: {
          plugins: ['@emotion/babel-plugin', 'babel-plugin-react-compiler'],
        },
      }),
      VitePWA({
        manifest: false, // Deaktiviert, da wir das externe manifest.json verwenden
        includeAssets: [
          '../public/favicon.ico',
          '../public/logo48.png',
          '../public/logo192.png',
          '../public/logo256.png',
          '../public/logo512.png',
        ],
        registerType: 'autoUpdate',
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
          navigateFallbackDenylist: [/^\/api/, /^\/config\.js$/],
          runtimeCaching: [
            {
              urlPattern: /\/config\.js$/i,
              handler: 'NetworkOnly',
            },
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
          ],
          skipWaiting: true,
          clientsClaim: true,
        },
        devOptions: {
          enabled: true,
        },
      }),
      tsconfigPaths(),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: [
        'react',
        'react-dom',
        '@palliroute/shared',
        '@palliroute/models',
        '@palliroute/api',
        '@palliroute/queries',
        '@palliroute/stores',
        '@palliroute/ui',
      ],
    },
    server: {
      fs: {
        allow: ['..'],
      },
      port: 3001,
      open: true,
      proxy: {
        '/api': {
          target: 'http://localhost:9000',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
