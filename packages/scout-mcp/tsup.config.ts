import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  target: 'node18',
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: true,
  shims: true,
});
