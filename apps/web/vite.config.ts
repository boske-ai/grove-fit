import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

const root = resolve(__dirname, '../..');

export default defineConfig({
  plugins: [react()],
  server: { port: 3847, host: '127.0.0.1', strictPort: true },
  build: { outDir: 'dist' },
  resolve: {
    alias: {
      '@boske-labs/grove-fit-ui/styles.css': resolve(root, 'packages/ui/src/styles.css'),
      '@boske-labs/grove-fit-ui': resolve(root, 'packages/ui/src/index.ts'),
      '@boske-labs/grove-fit-core': resolve(root, 'packages/core/src/index.ts'),
      '@boske-labs/grove-fit-detect': resolve(root, 'packages/detect/src/index.ts'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    exclude: ['@boske-labs/grove-fit-ui', '@boske-labs/grove-fit-core', '@boske-labs/grove-fit-detect'],
  },
});
