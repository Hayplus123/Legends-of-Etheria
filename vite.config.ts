import { defineConfig } from 'vite';

export default defineConfig({
  // Allows the game to work from a GitHub Pages repository path.
  base: './',

  // Development server settings.
  server: {
    host: '0.0.0.0'
  },

  // JavaScript build target.
  build: {
    target: 'es2022'
  }
});