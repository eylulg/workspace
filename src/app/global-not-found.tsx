import type { Metadata } from 'next';
import Link from 'next/link';
import '@/styles/globals.css';

export const metadata: Metadata = { title: 'Page not found · Workspace' };

/** Rendered with a real 404 status for paths the proxy rejects. It has no locale, so it is written in English. */
export default function GlobalNotFound() {
  return (
    <html lang='en'>
      <body className='bg-primary antialiased'>
        <main className='mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-3 px-4'>
          <h1 className='font-display text-2xl font-semibold text-primary'>Page not found</h1>
          <p className='text-secondary'>
            The page or issue you are looking for does not exist or was deleted.
          </p>
          <Link
            href='/en/issues'
            className='rounded-sm text-sm font-semibold text-brand outline-focus hover:underline focus-visible:outline-2'
          >
            Go to issues
          </Link>
        </main>
      </body>
    </html>
  );
}
