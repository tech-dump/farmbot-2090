import { defineConfig } from 'vite';

// base: './' keeps every asset path relative so the build runs from any
// subfolder, including the itch.io HTML5 upload wrapper.
export default defineConfig({
  base: './',
  server: {
    port: 5173,
    strictPort: true
  },
  build: {
    target: 'es2020',
    assetsInlineLimit: 0
  }
});
