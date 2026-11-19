import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const alias = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
  // The real package throws outside a React Server Components bundle.
  'server-only': fileURLToPath(new URL('./src/test-utils/empty-module.ts', import.meta.url)),
};

export default defineConfig({
  plugins: [react()],
  // The linked library has its own node_modules; one copy of React and React Aria keeps their contexts shared.
  resolve: { alias, dedupe: ['react', 'react-dom', 'react-aria-components', 'lucide-react'] },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'node',
          environment: 'node',
          include: ['src/lib/**/*.test.ts', 'src/server/**/*.test.ts', 'src/i18n/**/*.test.ts'],
          // PGlite boots a WebAssembly Postgres, which takes a few seconds on a cold start.
          testTimeout: 30_000,
          hookTimeout: 60_000,
        },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['src/features/**/*.test.tsx'],
          setupFiles: ['src/test-utils/setup-dom.ts'],
          // next-intl imports "next/navigation" without an extension, which only a bundler resolves.
          server: { deps: { inline: ['next-intl', '@eylulg/ui'] } },
        },
      },
    ],
  },
});
