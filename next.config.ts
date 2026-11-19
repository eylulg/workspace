import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

// `file:../ui` links the library from a sibling folder, which Next.js only bundles when the root includes it.
const root = path.join(import.meta.dirname, '..');

const nextConfig: NextConfig = {
  outputFileTracingRoot: root,
  cacheComponents: true,
  experimental: { globalNotFound: true },
  partialPrefetching: true,
  // PGlite ships a WebAssembly build of Postgres that must be loaded from node_modules at runtime.
  serverExternalPackages: ['@electric-sql/pglite'],
  turbopack: {
    root,
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default withNextIntl(nextConfig);
