import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'cli/index': 'src/cli/index.ts',
  },
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: false,
  shims: true,
  target: 'node18',
  esbuildOptions(options, context) {
    // Add shebang only to CLI entry
    if (context.format === 'esm') {
      options.banner = options.banner || {};
      options.banner.js = '#!/usr/bin/env node';
    }
  },
});
