import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:48180';

  return {
    plugins: [react()],
    server: {
      port: 3000,
      // Sur Docker Desktop (Windows), le watcher natif peut lever des EIO intermittents.
      // Le polling est moins performant mais beaucoup plus stable pour l'environnement dev/e2e.
      watch: {
        usePolling: true,
        interval: 300,
      },
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
