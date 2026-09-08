import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

// AMBIENTLY_LOCAL=1 points the import at the sibling checkout, for developing both at once.
const local = process.env.AMBIENTLY_LOCAL === '1';

export default defineConfig({
  base: '/patatap/',
  resolve: local ? { alias: { ambiently: fileURLToPath(new URL('../ambiently/src/index.ts', import.meta.url)) } } : undefined,
  build: { target: 'es2020', sourcemap: false },
});
