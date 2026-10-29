import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    /* Not `true`. `allowedHosts: true` turns off Vite's Host check, and a dev
       server with no Host check answers to any domain a DNS record can point at
       this machine — which is how a localhost dev server gets read from a page
       somewhere else (DNS rebinding). The preview proxy arrives as a subdomain of
       e2b.app, so that suffix plus localhost is the whole list this project needs;
       add your own origin here if you serve the dev server through a tunnel. */
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
  preview: {
    host: true,
    port: 4173,
    allowedHosts: ['.e2b.app', 'localhost', '127.0.0.1'],
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 2048,
    /* Everything this design needs is already a modern-browser feature —
       container queries, :has(), backdrop-filter — so there is nobody to
       transpile for. es2022 emits optional chaining and classes as written
       instead of expanding them, and dropping Vite's module-preload polyfill
       removes a shim whose only customer is a browser that could not render
       this layout anyway. */
    target: 'es2022',
    modulePreload: { polyfill: false },
    /* React and GSAP change far less often than this app, so they should not
       share a hashed filename with it: hoisted into two files of their own, a
       redeploy that touches only the app leaves both of them in cache, and the
       three files download in parallel instead of one being parsed after the
       other finished. */
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return null;
          return id.includes('gsap') ? 'vendor-gsap' : 'vendor-framework';
        },
      },
    },
  },
});
