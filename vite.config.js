import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  // Multi-Page Application (MPA) entry points
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        auth: resolve(__dirname, 'auth.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        fan_profile: resolve(__dirname, 'fan_profile.html'),
        vtuber_profile: resolve(__dirname, 'vtuber_profile.html'),
        support: resolve(__dirname, 'support.html'),
        admin_login: resolve(__dirname, 'admin_login.html'),
        admin_dashboard: resolve(__dirname, 'admin_dashboard.html'),
      },
    },
  },
  // Ensure environment variables with VITE_ prefix are exposed
  envPrefix: 'VITE_',
});
