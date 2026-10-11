import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import path from 'node:path';

// Mode « demo » : application autonome en un seul fichier HTML, données fictives
// générées dans le navigateur (aucun backend). Mode normal : SPA servie par l'API.
export default defineConfig(({ mode }) => {
  const demo = mode === 'demo';
  return {
    plugins: [react(), ...(demo ? [viteSingleFile()] : [])],
    resolve: { alias: { '@shared': path.resolve(__dirname, '../shared') } },
    server: {
      port: 5173,
      fs: { allow: ['..'] },
      proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: false } },
    },
    build: {
      outDir: demo ? 'dist-demo' : 'dist',
      assetsInlineLimit: demo ? 100_000_000 : 4096,
      chunkSizeWarningLimit: 2000,
      sourcemap: false,
    },
  };
});
